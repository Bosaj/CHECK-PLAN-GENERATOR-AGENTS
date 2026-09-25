<!-- Start SDK Example Usage [usage] -->
```python
# Synchronous Example
from checkplan_client import SDK


with SDK(
    server_url="https://api.example.com",
) as sdk:
    res = sdk.generate(
        request={
            "reglements": [],
        }
    )

    assert res is not None

    # Handle response
    print(res)
```

</br>

The same SDK client can also be used to make asynchronous requests by importing asyncio.
```python
# Asynchronous Example
import asyncio
from checkplan_client import SDK


async def main():

    async with SDK(
        server_url="https://api.example.com",
    ) as sdk:
        res = await sdk.generate_async(
            request={
                "reglements": [],
            }
        )

        assert res is not None

        # Handle response
        print(res)


asyncio.run(main())
```
<!-- End SDK Example Usage [usage] -->