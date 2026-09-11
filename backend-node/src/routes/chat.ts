import { Router } from 'express';
import { processChatTurn } from '../services/llm.service';
import axios from 'axios';

const router = Router();

router.post('/chat', async (req, res, next) => {
  try {
    const { message, conversationId, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ detail: 'Message cannot be empty.' });
      return;
    }

    // Optional legacy fallback proxy to FastAPI if explicitly requested in environment
    if (process.env.USE_FASTAPI_CHAT === 'true' && process.env.FASTAPI_URL) {
      try {
        const legacyRes = await axios.post(`${process.env.FASTAPI_URL}/api/v1/chat`, req.body, { timeout: 15000 });
        res.json(legacyRes.data);
        return;
      } catch (proxyErr) {
        console.warn('FastAPI legacy chat proxy failed, falling back to Express native LLM service.');
      }
    }

    // Native Express LLM Execution with database tool calling
    const result = await processChatTurn(message.trim(), conversationId, history);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as chatRouter };
