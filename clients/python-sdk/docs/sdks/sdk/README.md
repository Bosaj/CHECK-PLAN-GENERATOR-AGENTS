# SDK

## Overview

Check Planner API: This API is the Check Planner agents creator.

### Available Operations

* [generate](#generate) - Check Plan Generator
* [hello](#hello) - Hello

## generate

Check Plan Generator

### Example Usage

<!-- UsageSnippet language="python" operationID="Generate" method="post" path="/generate" -->
```python
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

### Parameters

| Parameter                                                                                       | Type                                                                                            | Required                                                                                        | Description                                                                                     |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `request`                                                                                       | [models.BodyCheckPlanGeneratorGeneratePost](../../models/bodycheckplangeneratorgeneratepost.md) | :heavy_check_mark:                                                                              | The request object to use for the request.                                                      |
| `retries`                                                                                       | [Optional[utils.RetryConfig]](../../models/utils/retryconfig.md)                                | :heavy_minus_sign:                                                                              | Configuration to override the default retry behavior of the client.                             |

### Response

**[models.AgentResult](../../models/agentresult.md)**

### Errors

| Error Type                 | Status Code                | Content Type               |
| -------------------------- | -------------------------- | -------------------------- |
| errors.HTTPValidationError | 422                        | application/json           |
| errors.SDKError            | 4XX, 5XX                   | \*/\*                      |

## hello

Hello

### Example Usage

<!-- UsageSnippet language="python" operationID="Hello" method="get" path="/" -->
```python
from checkplan_client import SDK


with SDK(
    server_url="https://api.example.com",
) as sdk:
    res = sdk.hello()

    assert res is not None

    # Handle response
    print(res)
```

### Parameters

| Parameter                                                           | Type                                                                | Required                                                            | Description                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `retries`                                                           | [Optional[utils.RetryConfig]](../../models/utils/retryconfig.md)    | :heavy_minus_sign:                                                  | Configuration to override the default retry behavior of the client. |

### Response

**[models.HelloOutput](../../models/hellooutput.md)**

### Errors

| Error Type      | Status Code     | Content Type    |
| --------------- | --------------- | --------------- |
| errors.SDKError | 4XX, 5XX        | \*/\*           |