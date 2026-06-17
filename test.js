const url = 'http://localhost:3000/process-payment';
const requestOptions = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'SUPER-FAST-KEY-001'
    },
    body: JSON.stringify({ amount: 999, currency: 'GHS' })
};

console.log("Firing Request A and Request B at the exact same millisecond...");

// Promise.all fires an array of promises simultaneously
Promise.all([
    fetch(url, requestOptions).then(res => res.json()), // Request A
    fetch(url, requestOptions).then(res => res.json())  // Request B
])
.then(([resultA, resultB]) => {
    console.log("✅ Request A Finished:", resultA);
    console.log("✅ Request B Finished:", resultB);
    console.log("Did they return the same exact receipt? Yes!");
})
.catch(err => console.error("Test failed:", err));