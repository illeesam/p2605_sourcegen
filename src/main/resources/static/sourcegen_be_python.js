/* ===== Source Generator : Backend (Python — FastAPI + SQLAlchemy) =====
 * 단일 테이블 풀세트:
 *  - main.py / database.py / config.py / requirements.txt
 *  - models/<table>.py / schemas/<table>.py
 *  - crud/<table>.py / services/<table>.py / routers/<table>.py
 *
 * 의존: gnAuditFields() (sourcegen.js)
 * 경로: /api/python/<endpoint>  (jpa /api/<endpoint> 와 충돌 회피)
 */

// ----- main.py -----
function gnPyMainSource(endpoint, className) {
    return `# FastAPI 진입점 — uvicorn main:app --reload --port 8000
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ${endpoint}

app = FastAPI(
    title="Generated API (Python)",
    description="FastAPI + SQLAlchemy CRUD",
    version="1.0.0"
)

# === CORS (개발용 — 운영 시 origins 화이트리스트로 좁힐 것) ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === 라우터 등록 ===
app.include_router(${endpoint}.router, prefix="/api/python")

@app.get("/")
def root():
    return {"app": "${className} API", "docs": "/docs"}
`;
}

// ----- database.py -----
function gnPyDatabaseSource(dbType) {
    const url = dbType === 'oracle'
        ? `'oracle+oracledb://USER:PASSWORD@HOST:1521/?service_name=SERVICE'`
        : `'postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME'`;
    return `# SQLAlchemy 엔진/세션 — config.py 의 DATABASE_URL 사용
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

# 운영 시 pool_size / pool_recycle 조정
engine = create_engine(
    DATABASE_URL,
    echo=False,         # 쿼리 로그 — True 로 하면 SQL 출력
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI Depends 용 — 요청마다 세션 발급/종료"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`;
}

// ----- config.py -----
function gnPyConfigSource(dbType) {
    if (dbType === 'oracle') {
        return `# DB 연결 설정 — 환경변수 또는 직접 수정
import os

# Oracle 예시: oracle+oracledb://USER:PWD@HOST:1521/?service_name=SERVICE
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "oracle+oracledb://USER:PASSWORD@localhost:1521/?service_name=XEPDB1"
)
`;
    }
    return `# DB 연결 설정 — 환경변수 또는 직접 수정
import os

# PostgreSQL 예시: postgresql+psycopg2://USER:PWD@HOST:5432/DBNAME
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://USER:PASSWORD@localhost:5432/postgres"
)
`;
}

// ----- requirements.txt -----
function gnPyRequirementsSource(dbType) {
    const driver = dbType === 'oracle' ? 'oracledb>=2.0.0' : 'psycopg2-binary>=2.9.0';
    return `fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
pydantic>=2.6.0
${driver}
`;
}

// ----- models/<endpoint>.py -----
function gnPyModelSource(endpoint, className, table, dataCols, pkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const fields = allItemCols.map(c => {
        const t = mapPyType(c.javaType);
        const pk = c.isPk ? ', primary_key=True' : '';
        const nullable = c.nullable ? '' : ', nullable=False';
        const length = (c.size && c.javaType === 'String') ? `(${c.size})` : '';
        const sqlType = c.javaType === 'String' ? `String${length}`
                      : c.javaType === 'LocalDateTime' ? 'DateTime'
                      : c.javaType === 'LocalDate' ? 'Date'
                      : c.javaType === 'Integer' ? 'Integer'
                      : c.javaType === 'Long' ? 'BigInteger'
                      : c.javaType === 'Boolean' ? 'Boolean'
                      : c.javaType === 'java.math.BigDecimal' ? 'Numeric'
                      : 'String(255)';
        return `    ${c.javaName} = Column("${c.name}", ${sqlType}${pk}${nullable})`;
    }).join('\n');

    return `# SQLAlchemy 모델 — ${table}
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, Date, Numeric
from database import Base


class ${className}(Base):
    __tablename__ = "${table}"

${fields}
`;
}

// ----- schemas/<endpoint>.py (Pydantic Request / Item / Response) -----
function gnPySchemaSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    const reqFields = dataCols.map(c => {
        const t = mapPyTypeStr(c.javaType);
        // Required 여부: NOT NULL 이고 audit 아닌 경우
        const required = !c.nullable && !c.isAudit;
        const dflt = required ? '' : ' = None';
        const opt = required ? t : `Optional[${t}]`;
        return `    ${c.javaName}: ${opt}${dflt}`;
    }).join('\n');

    const itemFields = allItemCols.map(c => {
        const t = mapPyTypeStr(c.javaType);
        return `    ${c.javaName}: Optional[${t}] = None`;
    }).join('\n');

    return `# Pydantic 스키마 — Request / Item / Response
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field


class ${className}Request(BaseModel):
    """요청 DTO (등록/수정/검색/페이징/정렬/일괄저장 통합)"""
${reqFields}

    # === 페이징/정렬/일괄저장 메타 ===
    pageNo: int = 1
    pageSize: int = 10
    sortBy: Optional[str] = None
    rowStatus: Optional[str] = None  # 'I' / 'U' / 'D'

    @property
    def offset(self) -> int:
        return (self.pageNo - 1) * self.pageSize


class ${className}Item(BaseModel):
    """응답 DTO (단건/목록 행)"""
${itemFields}

    model_config = {"from_attributes": True}


class ${className}Response(BaseModel):
    """페이지 응답 DTO"""
    pageList: List[${className}Item]
    pageTotalCount: int
    pageNo: int
    pageSize: int
    pageTotalPages: int
    pageCond: Dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def of(cls, page_list, page_total_count, page_no, page_size, page_cond):
        page_total_pages = 0 if page_size <= 0 else -(-page_total_count // page_size)
        return cls(
            pageList=page_list,
            pageTotalCount=page_total_count,
            pageNo=page_no,
            pageSize=page_size,
            pageTotalPages=page_total_pages,
            pageCond=page_cond or {}
        )
`;
}

// ----- crud/<endpoint>.py -----
function gnPyCrudSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const pkArgs = pkCols.map(c => `${c.javaName}: str`).join(', ');
    const pkFilter = pkCols.map(c => `models_mod.${className}.${c.javaName} == ${c.javaName}`).join(', ');
    const stringDataCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    const condIfs = stringDataCols.map(c =>
        `    if req.${c.javaName}:\n` +
        `        q = q.filter(models_mod.${className}.${c.javaName}.ilike(f"%{req.${c.javaName}}%"))`
    ).join('\n');

    const sortMap = dataCols.filter(c => !c.isAudit).map(c =>
        `        '${c.javaName} asc':  models_mod.${className}.${c.javaName}.asc(),\n` +
        `        '${c.javaName} desc': models_mod.${className}.${c.javaName}.desc(),`
    ).join('\n');

    const condDictItems = dataCols.filter(c => !c.isAudit).map(c =>
        `    if req.${c.javaName} is not None and req.${c.javaName} != '':\n` +
        `        m['${c.javaName}'] = req.${c.javaName}`
    ).join('\n');

    return `# CRUD — DB 액세스 (${className})
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc

import models.${endpoint} as models_mod
import schemas.${endpoint} as schemas_mod


def _build_query(db: Session, req: schemas_mod.${className}Request):
    """검색조건 + 정렬 적용된 쿼리 빌드"""
    q = db.query(models_mod.${className})
${condIfs}
    # 정렬
    sort_map = {
${sortMap}
    }
    if req.sortBy and req.sortBy in sort_map:
        q = q.order_by(sort_map[req.sortBy])
    return q


def to_cond(req: schemas_mod.${className}Request) -> Dict[str, Any]:
    """Request → pageCond Dict (값이 있는 검색 필드만, 페이징/정렬/rowStatus 제외)"""
    m: Dict[str, Any] = {}
${condDictItems}
    return m


def select_by_id(db: Session, ${pkArgs}) -> Optional[models_mod.${className}]:
    return db.query(models_mod.${className}).filter(${pkFilter}).first()


def select_list(db: Session, req: schemas_mod.${className}Request) -> List[models_mod.${className}]:
    q = _build_query(db, req)
    if req.pageSize > 0 and req.pageNo > 0:
        q = q.offset(req.offset).limit(req.pageSize)
    return q.all()


def select_page_list(db: Session, req: schemas_mod.${className}Request):
    page_no   = req.pageNo   if req.pageNo   > 0 else 1
    page_size = req.pageSize if req.pageSize > 0 else 10

    q = _build_query(db, req)
    total = q.count()
    rows = q.offset((page_no - 1) * page_size).limit(page_size).all()
    return rows, total, page_no, page_size


def insert(db: Session, req: schemas_mod.${className}Request) -> models_mod.${className}:
    data = req.model_dump(exclude={"pageNo", "pageSize", "sortBy", "rowStatus"}, exclude_none=True)
    obj = models_mod.${className}(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, ${pkArgs}, req: schemas_mod.${className}Request) -> Optional[models_mod.${className}]:
    obj = select_by_id(db, ${pkCols.map(c => c.javaName).join(', ')})
    if not obj:
        return None
${nonPkCols.filter(c => !c.isAudit).map(c => `    obj.${c.javaName} = req.${c.javaName}`).join('\n')}
    db.commit()
    db.refresh(obj)
    return obj


def patch(db: Session, ${pkArgs}, req: schemas_mod.${className}Request) -> Optional[models_mod.${className}]:
    """null 이 아닌 필드만 갱신"""
    obj = select_by_id(db, ${pkCols.map(c => c.javaName).join(', ')})
    if not obj:
        return None
${nonPkCols.filter(c => !c.isAudit).map(c => `    if req.${c.javaName} is not None:\n        obj.${c.javaName} = req.${c.javaName}`).join('\n')}
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, ${pkArgs}) -> bool:
    obj = select_by_id(db, ${pkCols.map(c => c.javaName).join(', ')})
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True
`;
}

// ----- services/<endpoint>.py -----
function gnPyServiceSource(endpoint, className, pkCols) {
    const pkArgs = pkCols.map(c => `${c.javaName}: str`).join(', ');
    const pkCall = pkCols.map(c => c.javaName).join(', ');
    const reqPkCall = pkCols.map(c => `req.${c.javaName}`).join(', ');

    return `# Service — 비즈니스 로직 (${className})
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

import crud.${endpoint} as crud_mod
import schemas.${endpoint} as schemas_mod


def select_by_id(db: Session, ${pkArgs}) -> schemas_mod.${className}Item:
    obj = crud_mod.select_by_id(db, ${pkCall})
    if not obj:
        raise HTTPException(404, f"${className} not found")
    return schemas_mod.${className}Item.model_validate(obj)


def select_list(db: Session, req: schemas_mod.${className}Request) -> List[schemas_mod.${className}Item]:
    rows = crud_mod.select_list(db, req)
    return [schemas_mod.${className}Item.model_validate(r) for r in rows]


def select_page_list(db: Session, req: schemas_mod.${className}Request) -> schemas_mod.${className}Response:
    rows, total, page_no, page_size = crud_mod.select_page_list(db, req)
    items = [schemas_mod.${className}Item.model_validate(r) for r in rows]
    return schemas_mod.${className}Response.of(items, total, page_no, page_size, crud_mod.to_cond(req))


def insert(db: Session, req: schemas_mod.${className}Request) -> schemas_mod.${className}Item:
    obj = crud_mod.insert(db, req)
    return schemas_mod.${className}Item.model_validate(obj)


def update(db: Session, ${pkArgs}, req: schemas_mod.${className}Request) -> schemas_mod.${className}Item:
    obj = crud_mod.update(db, ${pkCall}, req)
    if not obj:
        raise HTTPException(404, f"${className} not found")
    return schemas_mod.${className}Item.model_validate(obj)


def patch(db: Session, ${pkArgs}, req: schemas_mod.${className}Request) -> schemas_mod.${className}Item:
    obj = crud_mod.patch(db, ${pkCall}, req)
    if not obj:
        raise HTTPException(404, f"${className} not found")
    return schemas_mod.${className}Item.model_validate(obj)


def delete(db: Session, ${pkArgs}) -> None:
    if not crud_mod.delete(db, ${pkCall}):
        raise HTTPException(404, f"${className} not found")


def save_one(db: Session, req: schemas_mod.${className}Request) -> schemas_mod.${className}Item | None:
    """rowStatus = I/U/D 단건 저장"""
    rs = (req.rowStatus or '').strip().upper()
    if rs == 'I':
        return insert(db, req)
    if rs == 'U':
        return update(db, ${reqPkCall}, req)
    if rs == 'D':
        delete(db, ${reqPkCall})
        return None
    raise HTTPException(400, f"Unknown rowStatus: [{req.rowStatus}] (expected I/U/D)")


def save_list(db: Session, req_list: List[schemas_mod.${className}Request]) -> None:
    """목록 일괄 저장 (D → U → I)"""
    if not req_list:
        return
    for r in req_list:
        if (r.rowStatus or '').strip().upper() == 'D':
            save_one(db, r)
    for r in req_list:
        if (r.rowStatus or '').strip().upper() == 'U':
            save_one(db, r)
    for r in req_list:
        if (r.rowStatus or '').strip().upper() == 'I':
            save_one(db, r)
`;
}

// ----- routers/<endpoint>.py -----
function gnPyRouterSource(endpoint, className, pkCols) {
    const pathSeg = pkCols.map(c => `{${c.javaName}}`).join('/');
    const pkArgs = pkCols.map(c => `${c.javaName}: str`).join(', ');
    const pkCall = pkCols.map(c => c.javaName).join(', ');

    return `# Router — REST 엔드포인트 (${className})
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas.${endpoint} as schemas_mod
import services.${endpoint} as service
from database import get_db

router = APIRouter(
    prefix="/${endpoint}",
    tags=["${className}"]
)


@router.get("/page-list", response_model=schemas_mod.${className}Response, summary="페이지 목록")
def page_list(req: schemas_mod.${className}Request = Depends(), db: Session = Depends(get_db)):
    return service.select_page_list(db, req)


@router.get("/list", response_model=List[schemas_mod.${className}Item], summary="전체 목록")
def list_all(req: schemas_mod.${className}Request = Depends(), db: Session = Depends(get_db)):
    return service.select_list(db, req)


@router.get("/${pathSeg}", response_model=schemas_mod.${className}Item, summary="단건 조회")
def select_by_id(${pkArgs}, db: Session = Depends(get_db)):
    return service.select_by_id(db, ${pkCall})


@router.post("", response_model=schemas_mod.${className}Item, summary="등록")
def insert(req: schemas_mod.${className}Request, db: Session = Depends(get_db)):
    return service.insert(db, req)


@router.put("/${pathSeg}", response_model=schemas_mod.${className}Item, summary="수정 (전체 교체)")
def update(${pkArgs}, req: schemas_mod.${className}Request, db: Session = Depends(get_db)):
    return service.update(db, ${pkCall}, req)


@router.patch("/${pathSeg}", response_model=schemas_mod.${className}Item, summary="부분 수정 (PATCH)")
def patch(${pkArgs}, req: schemas_mod.${className}Request, db: Session = Depends(get_db)):
    return service.patch(db, ${pkCall}, req)


@router.delete("/${pathSeg}", summary="삭제")
def delete(${pkArgs}, db: Session = Depends(get_db)):
    service.delete(db, ${pkCall})
    return {"deleted": True}


@router.post("/save-one", response_model=schemas_mod.${className}Item | None, summary="단건 일괄 저장 (I/U/D)")
def save_one(req: schemas_mod.${className}Request, db: Session = Depends(get_db)):
    return service.save_one(db, req)


@router.post("/save-list", summary="목록 일괄 저장 (D → U → I)")
def save_list(req_list: List[schemas_mod.${className}Request], db: Session = Depends(get_db)):
    service.save_list(db, req_list)
    return {"saved": True}
`;
}

// ----- 헬퍼: javaType → SQLAlchemy 컬럼 타입은 gnPyModelSource 안에서 처리. 여기서는 Pydantic 표기용 -----
function mapPyTypeStr(javaType) {
    switch (javaType) {
        case 'String':              return 'str';
        case 'Integer':             return 'int';
        case 'Long':                return 'int';
        case 'Boolean':             return 'bool';
        case 'LocalDateTime':       return 'datetime';
        case 'LocalDate':           return 'date';
        case 'java.math.BigDecimal':return 'Decimal';
        default:                    return 'str';
    }
}
function mapPyType(javaType) { return mapPyTypeStr(javaType); }
