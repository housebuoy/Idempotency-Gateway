# Idempotent Payment Processing API

A  Node.js/Express REST API that safely processes payments while preventing accidental double-charges through idempotency keys and in-memory read-through caching.

## Architecture Diagram

This sequence diagram illustrates how the system handles pioneer requests, safe duplicates, and high-concurrency race conditions (in-flight requests).

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
        Note over Processor: 2-Second Simulated Delay
        Processor-->>API: Payment Result (Success)
        API->>Store: Update {State: COMPLETED, Response}
        API-->>Client: 201 Created 
        
        Note over API, Store: TTL Background Task
        API-->>Store: setTimeout(Delete Key, 24 Hours)
        
    else Key Found (Duplicate or Conflict)
        Store-->>API: Existing Record {State, OriginalPayload, Response}
        
        alt Payload Mismatch (Fraud/Error Check)
            API-->>Client: 409 Conflict <br/> "Key already used for a different request body"
            
        else Payload Match & State == COMPLETED (Idempotency Logic)
            API-->>Client: 200 OK Cached Response <br/> (Header: X-Cache-Hit: true)
            
        else Payload Match & State == PROCESSING (In-Flight Race Condition)
            Note over API: Request blocks and waits<br/>for the initial Promise to resolve
            API->>Store: Await Completion
            Store-->>API: Payment Result (Success)
            API-->>Client: 200 OK Cached Response
        end
    end
```

## Setup Instructions

### Prerequisites
Before you begin, ensure you have **Node.js** and **npm** installed on your machine.

### Installation & Execution

1. **Clone the repository:**
   ```bash
   git clone https://github.com/housebuoy/Idempotency-Gateway.git

   cd Idempotency-Gateway
   ```

2. **Install the dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
The server will start and listen on http://localhost:3000 by default.


## API Documentation

### Process Payment
Processes a payment securely, guaranteeing that requests with the exact same `Idempotency-Key` are only charged once.

* **URL:** `/process-payment`
* **Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
  * `Idempotency-Key: <unique-string>` **(Required)**

* **Request Body:**
  ```json
  {
    "amount": 250,
    "currency": "GHS"
  }
  ```


