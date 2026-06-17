### Architecture & Logic Flow

The following sequence diagram illustrates how the Idempotency Gateway handles incoming payment requests, manages state, and prevents double-charging and race conditions.

```mermaid
sequenceDiagram
    participant Client as Client
    participant API as Idempotency Middleware
    participant Store as Data Store (In-Memory Map)
    participant Processor as Payment Processor

    Client->>API: POST /process-payment <br/> (Headers: Idempotency-Key, Body: Payload)
    API->>Store: Lookup Idempotency-Key
    
    alt Key Not Found (Happy Path)
        Store-->>API: null
        API->>Store: Save {State: PROCESSING, OriginalPayload}
        API->>Processor: Execute Payment Logic
        Note over Processor: ⏳ 2-Second Simulated Delay
        Processor-->>API: Payment Result (Success)
        API->>Store: Update {State: COMPLETED, Response}
        API-->>Client: 200/201 OK 
        
    else Key Found (Duplicate or Conflict)
        Store-->>API: Existing Record {State, OriginalPayload, Response}
        
        alt Payload Mismatch (Fraud/Error Check)
            API-->>Client: 409 Conflict <br/> "Key already used for a different request"
            
        else Payload Match & State == COMPLETED (Idempotency Logic)
            API-->>Client: Cached Response <br/> (Header: X-Cache-Hit: true)
            
        else Payload Match & State == PROCESSING (In-Flight Race Condition)
            Note over API: 🛑 Request blocks and waits<br/>for the initial Promise to resolve
            API->>Store: Await Completion
            Store-->>API: Payment Result (Success)
            API-->>Client: Cached Response
        end
    end