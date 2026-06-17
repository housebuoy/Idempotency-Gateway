
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;             // the port number that the server will listen on, if not specified in the environment variables, it defaults to 3000

app.use(express.json());                          // the translator or middleware that translates the incoming request into a proper format so the code can understand

const idempotencyKeyStore = new Map();

                                                   //req contains the everuthing the client sent to you 
app.post('/process-payment', async(req, res) =>{

                                                    // User Story 1: As a client system (e.g., an online store), I want to send a payment request with a unique ID, So that my transaction is processed successfully.
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey){
        return res.status(400).json({ error: 'Idempotency key is required' }); // the response from the server and in this case the status code for "Bad Request" is 400 and sends it as a JSON object back to the client
    }

                                                // User Story 2: As a client system, I want to safely retry a request if I don't hear back, So that I don't accidentally double-charge the user.
    if (idempotencyKeyStore.has(idempotencyKey)){
        console.log("Duplicate request detected for key", idempotencyKey); 
        const cachedResponse = idempotencyKeyStore.get(idempotencyKey);
        const oldBodyString = JSON.stringify(cachedResponse.originalRequest)
        const newBodyString = JSON.stringify(req.body)


        if (oldBodyString !== newBodyString){

            return res.status(409).json({error: "Idempotency key already used for a different request body."})
        }

        if(cachedResponse.status === "IN_FLIGHT"){
            const result = await cachedResponse.pendingTask;
            res.set('X-Cache-Hit', `true`)
            return res.status(200).json(result);
        }
        res.set('X-Cache-Hit', `true`)

        return res.status(200).json(cachedResponse.receipt); // the response from the server and in this case the status code for "OK" is 200 and sends it as a JSON object back to the client
    }
    console.log("Processing payment for key", idempotencyKey); // log the idempotency key to the console for debugging purposes

    const processingPromise = new Promise(resolve => {
        setTimeout(() => {
            resolve({ status: `Charged ${req.body.amount} ${req.body.currency}`});
        }, 2000);
    });

    idempotencyKeyStore.set(idempotencyKey, {
        originalRequest: req.body,
        status: "IN_FLIGHT",
        pendingTask: processingPromise
    });

     // simulating a delay of 2 seconds to mimic the time taken to process a payment
    const responseBody = await processingPromise;

    idempotencyKeyStore.set(idempotencyKey, {
        originalRequest: req.body,
        status: "COMPLETED",
        receipt: responseBody,
        statusCode: 201
    });

    setTimeout(() => {
        idempotencyKeyStore.delete(idempotencyKey);
        console.log(`Cleaned up key ${idempotencyKey} from memory.`);
    }, 24 * 60 * 60 * 1000);

    return res.status(201).json(responseBody); // the response from the server and in this case the status code for "Created" is 201 and sends it as a JSON object back to the client
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
   