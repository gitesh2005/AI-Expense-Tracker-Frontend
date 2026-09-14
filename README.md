# AI Expense Tracker — Frontend

React frontend for the AI Expense Tracker — a full-stack app that eliminates manual expense entry using AI.

🔗 **Live Demo:** [ai-expense-tracker-frontend.netlify.app](https://ai-expense-tracker-frontend.netlify.app)
🔗 **Backend Repo:** [AI-Expense-Tracker](https://github.com/gitesh2005/AI-Expense-Tracker)

> Note: The backend runs on Render's free tier, so the first request after a period of inactivity may take 30–60 seconds to respond while the server wakes up.

## Features

- **AI auto-categorization** — type "swiggy order 350" and it's tagged "Food" automatically
- **Voice input** — mic button uses the browser's Speech Recognition API to fill the description
- **Screenshot/invoice upload** — upload a UPI payment confirmation or invoice; a vision AI model extracts the merchant and amount directly from the image
- **Manual category override** — click any category badge to correct it when AI gets it wrong
- **Spending breakdown** — donut chart of spending by category (Recharts)
- **AI savings suggestions** — analyzes spending patterns and suggests where to cut back
- **Excel export** — download all expenses as a formatted .xlsx file
- **Monthly reset with history** — "Clear All" archives the month's totals before wiping, and a Monthly History view shows month-over-month % change
- **Delete controls** — remove individual expenses or accidentally-created monthly archive records

## Tech Stack

- React (Vite)
- Recharts (charts)
- Axios (API calls)
- Web Speech API (voice input)

## Setup

1. Clone this repo
2. Install dependencies:
```bash
   npm install
```
3. Update the backend URL in `src/api/axiosConfig.js`:
```js
   const api = axios.create({
     baseURL: 'http://localhost:8080/api', // or your deployed backend URL
   });
```
4. Run the dev server:
```bash
   npm run dev
```

## Related Repo

This is the frontend half of the project. The Spring Boot backend (REST API, MongoDB, AI integration) lives in a separate repo: [AI-Expense-Tracker](https://github.com/gitesh2005/AI-Expense-Tracker)

## Future Scope

- Native Android companion app for SMS-based automatic transaction detection
- Multi-user support with authentication
- Budget limits per category with alerts