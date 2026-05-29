// /admin/marketing/chat — AI Marketing Assistant
// Full-screen chat interface with conversation history, quick actions, and Claude tool-calling.

import ChatInterface from "@/components/marketing/ChatInterface";

export const metadata = {
  title: "Marketing AI Chat | Kynda Coffee Admin",
};

export default function MarketingChatPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <ChatInterface />
    </div>
  );
}
