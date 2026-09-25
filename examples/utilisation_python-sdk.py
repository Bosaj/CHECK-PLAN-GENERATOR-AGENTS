import traceback

from checkplan_client import SDK

try:
    with SDK(server_url="http://localhost:8057") as sdk:
        with open(r"../reglements/FT NOVUS GREEN PACK DI_0_0-1-5.pdf", "rb") as f:
            res = sdk.generate(
                request={
                    "reglements": [
                        {
                            "content": f.read(),  # fichier ouvert en mode binaire
                            "fileName": "FT NOVUS GREEN PACK DI_0_0-1-5.pdf",
                            "contentType": "application/json",
                        }
                    ]
                }
            )

        print(res)
except Exception:
    traceback.print_exc()


"""
import requests

url = "http://localhost:8057/check-planner/api/v1/generate"

files = [
    ("reglements", ("FT NOVUS GREEN PACK DI_0_0-1-5.pdf", open(r"../reglements/FT NOVUS GREEN PACK DI_0_0-1-5.pdf", "rb"), "application/pdf"))
]

r = requests.post(url, files=files)
print(r.status_code, r.text)
"""
