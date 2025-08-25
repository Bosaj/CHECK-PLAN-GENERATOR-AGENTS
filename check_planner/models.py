from typing import List, Optional

from pydantic import BaseModel


class HelloOutput(BaseModel):
    Message: str = ""


class AgentResult(BaseModel):
    rg_path: str
    max_pages: int
    max_rgs: int
    output_file: str
