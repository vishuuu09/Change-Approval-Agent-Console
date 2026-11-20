import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import agent
from .db import get_db
from .deps import current_user, require_role
from .models import AuditLog, ChangeRequest, User
from .schemas import AuditOut, ChangeCreate, ChangeOut, ReviewBody

log = logging.getLogger("changes")
router = APIRouter(prefix="/changes", tags=["changes"])


def _audit(db: Session, request_id: int, actor: str, action: str, detail: str = "") -> None:
    db.add(AuditLog(request_id=request_id, actor=actor, action=action, detail=detail))


def _get(db: Session, change_id: int) -> ChangeRequest:
    cr = db.get(ChangeRequest, change_id)
    if cr is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Change request not found")
    return cr


@router.post("", response_model=ChangeOut, status_code=201)
def create_change(
    body: ChangeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("engineer")),
):
    cr = ChangeRequest(
        title=body.title, description=body.description, status="draft", created_by=user.username
    )
    db.add(cr)
    db.flush()
    _audit(db, cr.id, user.username, "created")
    try:
        plan = agent.draft_plan(cr.title, cr.description)
        cr.plan = plan.model_dump()
        cr.status = "pending_approval"
        _audit(db, cr.id, "agent", "plan_drafted", plan.summary)
    except agent.PlanningError as exc:
        cr.status = "planning_failed"  # graceful failure: request is kept, nothing executes
        _audit(db, cr.id, "agent", "planning_failed", str(exc))
    db.commit()
    db.refresh(cr)
    return cr


@router.get("", response_model=list[ChangeOut])
def list_changes(
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    limit = max(1, min(limit, 100))
    q = select(ChangeRequest).order_by(ChangeRequest.id.desc()).limit(limit).offset(offset)
    if status_filter:
        q = q.where(ChangeRequest.status == status_filter)
    return db.scalars(q).all()


@router.get("/{change_id}", response_model=ChangeOut)
def get_change(change_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    return _get(db, change_id)


@router.get("/{change_id}/audit", response_model=list[AuditOut])
def get_audit(change_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    _get(db, change_id)
    return db.scalars(
        select(AuditLog).where(AuditLog.request_id == change_id).order_by(AuditLog.id)
    ).all()


def _review(change_id: int, body: ReviewBody, db: Session, user: User, decision: str) -> ChangeRequest:
    cr = _get(db, change_id)
    if cr.status != "pending_approval":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot review a request in '{cr.status}'")
    if cr.created_by == user.username:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Requesters cannot review their own request")
    cr.status = decision
    cr.reviewed_by = user.username
    cr.review_comment = body.comment
    _audit(db, cr.id, user.username, decision, body.comment)
    db.commit()
    db.refresh(cr)
    return cr


@router.post("/{change_id}/approve", response_model=ChangeOut)
def approve(
    change_id: int,
    body: ReviewBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("approver")),
):
    return _review(change_id, body, db, user, "approved")


@router.post("/{change_id}/reject", response_model=ChangeOut)
def reject(
    change_id: int,
    body: ReviewBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("approver")),
):
    return _review(change_id, body, db, user, "rejected")


@router.post("/{change_id}/execute", response_model=ChangeOut)
def execute(
    change_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("engineer")),
):
    cr = _get(db, change_id)
    if cr.status != "approved":  # the human-approval gate
        raise HTTPException(status.HTTP_409_CONFLICT, "Only approved requests can be executed")
    cr.status = "executed"  # mock execution: real systems would be called here
    _audit(db, cr.id, user.username, "executed")
    db.commit()
    db.refresh(cr)
    log.info("change executed", extra={"ctx": {"change_id": cr.id, "actor": user.username}})
    return cr
