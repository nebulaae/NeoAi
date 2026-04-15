import { Chats } from '@/components/pages/Chats';

const ChatsPage = () => {
  return <Chats />;
};

export default ChatsPage;

// {
//     "success": true,
//     "dialogue_id": "103396271948",
//     "title": null,
//     "messages": [
//         {
//             "id": 244200,
//             "model": "sosana/nano-banana",
//             "version": "Nano Banana",
//             "role_id": null,
//             "inputs": {
//                 "text": "привет",
//                 "media": []
//             },
//             "params": {
//                 "aspect_ratio": "auto"
//             },
//             "cost": 12,
//             "status": "completed",
//             "result": {
//                 "text": null,
//                 "media": [
//                     {
//                         "type": "image",
//                         "input": "https://main-r2.sosana.blog/banana/output/019d927f-c9b1-7416-88d8-f858a50eabe6.png",
//                         "format": "url"
//                     }
//                 ]
//             },
//             "error": null,
//             "created_at": "2026-04-15T18:55:41.000Z"
//         }
//     ]
// }
