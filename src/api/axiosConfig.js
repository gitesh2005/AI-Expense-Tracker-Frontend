import axios from 'axios';

const api = axios.create({
  baseURL: 'https://ai-expense-tracker-ow9p.onrender.com/api',
});

export default api;