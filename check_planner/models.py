
from pydantic import BaseModel


class HelloOutput(BaseModel):
    Message: str = ""


class AgentResult(BaseModel):
    rg_path: str | None = ""
    max_pages: int | None = 0
    max_rgs: int | None = 0
    output_file: str
