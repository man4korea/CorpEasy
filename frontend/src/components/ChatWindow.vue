const response = await fetch('http://localhost:3002/api/askGPT', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: userInput }),
}); 