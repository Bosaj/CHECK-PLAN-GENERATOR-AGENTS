<!-- Start SDK Example Usage [usage] -->
```typescript
import { SDK } from "openapi";

const sdk = new SDK({
  serverURL: "https://api.example.com",
});

async function run() {
  const result = await sdk.generate({
    reglements: [],
  });

  console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->