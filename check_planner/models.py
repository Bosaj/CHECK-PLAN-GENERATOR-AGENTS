from typing import List, Optional

from pydantic import BaseModel


class HelloOutput(BaseModel):
    Message: str = ""


class AgentResult(BaseModel):
    rg_path: Optional[str] = ""
    max_pages: Optional[int] = 0
    max_rgs: Optional[int] = 0
    output_file: str
