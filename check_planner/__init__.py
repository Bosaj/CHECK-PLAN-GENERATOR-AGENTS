from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .route import router

app = FastAPI(
    root_path="/check-planner/api/v1",
    title="Check Planner API",
    description="This Api is Check Planner agents creator.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:*",
    ],  # Remplacez par les origines autorisées
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8057, reload=True)
