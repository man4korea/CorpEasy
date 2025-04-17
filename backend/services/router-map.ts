// 📁 backend/services/router-map.ts
import * as GPT35 from './gpt35-service';
import * as GPT4 from './gpt4-service';
// ... 다른 AI들

export const getServiceByModel = (model: string) => {
  switch (model) {
    case 'gpt35': return GPT35;
    case 'gpt4': return GPT4;
    // ...
    default: return null;
  }
};
