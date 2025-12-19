"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  HelpCircle, 
  Bookmark, 
  Send, 
  Pin,
  CheckCircle
} from "lucide-react";

export type ChatMessageType = "general" | "question" | "resource";

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  userId: string;
  userName: string;
  userImage?: string;
  timestamp: number;
  isPinned?: boolean;
  isAnswered?: boolean; // For questions
  answeredBy?: string; // User who answered
}

interface SegmentedChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, type: ChatMessageType) => void;
  onPinMessage?: (messageId: string) => void;
  onMarkAnswered?: (messageId: string) => void;
  currentUserId: string;
  isModerator?: boolean;
}

type ChatTab = "all" | "questions" | "resources";

export function SegmentedChat({
  messages,
  onSendMessage,
  onPinMessage,
  onMarkAnswered,
  currentUserId,
  isModerator = false,
}: SegmentedChatProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>("all");
  const [messageInput, setMessageInput] = useState("");
  const [messageType, setMessageType] = useState<ChatMessageType>("general");

  // Filter messages based on active tab
  const filteredMessages = messages.filter((msg) => {
    if (activeTab === "all") return true;
    if (activeTab === "questions") return msg.type === "question";
    if (activeTab === "resources") return msg.type === "resource" || msg.isPinned;
    return true;
  });

  // Count unread/pending items
  const questionCount = messages.filter((m) => m.type === "question" && !m.isAnswered).length;
  const resourceCount = messages.filter((m) => m.type === "resource" || m.isPinned).length;

  const handleSend = () => {
    if (!messageInput.trim()) return;
    
    onSendMessage(messageInput, messageType);
    setMessageInput("");
    setMessageType("general");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
          icon={<MessageSquare className="w-4 h-4" />}
          label="All Chat"
        />
        <TabButton
          active={activeTab === "questions"}
          onClick={() => setActiveTab("questions")}
          icon={<HelpCircle className="w-4 h-4" />}
          label="Q&A"
          badge={questionCount}
        />
        <TabButton
          active={activeTab === "resources"}
          onClick={() => setActiveTab("resources")}
          icon={<Bookmark className="w-4 h-4" />}
          label="Resources"
          badge={resourceCount}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.map((message) => (
          <ChatMessageComponent
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            isModerator={isModerator}
            onPin={onPinMessage}
            onMarkAnswered={onMarkAnswered}
          />
        ))}
        
        {filteredMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <MessageSquare className="w-12 h-12 mb-2" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {/* Message Type Selector */}
        <div className="flex gap-2 mb-3">
          <TypeButton
            active={messageType === "general"}
            onClick={() => setMessageType("general")}
            icon={<MessageSquare className="w-3 h-3" />}
            label="Chat"
          />
          <TypeButton
            active={messageType === "question"}
            onClick={() => setMessageType("question")}
            icon={<HelpCircle className="w-3 h-3" />}
            label="Question"
          />
          {isModerator && (
            <TypeButton
              active={messageType === "resource"}
              onClick={() => setMessageType("resource")}
              icon={<Bookmark className="w-3 h-3" />}
              label="Resource"
            />
          )}
        </div>

        {/* Input Field */}
        <div className="flex gap-2">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              messageType === "question"
                ? "Ask a question..."
                : messageType === "resource"
                ? "Share a resource..."
                : "Type a message..."
            }
            rows={2}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Button Component
 */
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
        active
          ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * Message Type Button Component
 */
interface TypeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TypeButton({ active, onClick, icon, label }: TypeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        active
          ? "bg-purple-600 text-white"
          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * Individual Chat Message Component
 */
interface ChatMessageComponentProps {
  message: ChatMessage;
  currentUserId: string;
  isModerator: boolean;
  onPin?: (messageId: string) => void;
  onMarkAnswered?: (messageId: string) => void;
}

function ChatMessageComponent({
  message,
  currentUserId,
  isModerator,
  onPin,
  onMarkAnswered,
}: ChatMessageComponentProps) {
  const isOwn = message.userId === currentUserId;
  const isQuestion = message.type === "question";
  const isResource = message.type === "resource";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 p-3 rounded-lg ${
        message.isPinned
          ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
          : isQuestion && !message.isAnswered
          ? "bg-blue-50 dark:bg-blue-900/20"
          : isResource
          ? "bg-purple-50 dark:bg-purple-900/20"
          : "bg-gray-50 dark:bg-gray-800"
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.userImage ? (
          <img
            src={message.userImage}
            alt={message.userName}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
            {message.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {message.userName}
            </span>
            {isQuestion && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                Question
              </span>
            )}
            {isResource && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                Resource
              </span>
            )}
            {message.isPinned && (
              <Pin className="w-3 h-3 text-yellow-600" />
            )}
            {message.isAnswered && (
              <CheckCircle className="w-3 h-3 text-green-600" />
            )}
          </div>
          
          {/* Actions */}
          {isModerator && (
            <div className="flex items-center gap-1">
              {!message.isPinned && onPin && (
                <button
                  onClick={() => onPin(message.id)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Pin message"
                >
                  <Pin className="w-3 h-3 text-gray-500" />
                </button>
              )}
              {isQuestion && !message.isAnswered && onMarkAnswered && (
                <button
                  onClick={() => onMarkAnswered(message.id)}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                  title="Mark as answered"
                >
                  <CheckCircle className="w-3 h-3 text-green-600" />
                </button>
              )}
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
          {message.content}
        </p>
        
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        
        {message.isAnswered && message.answeredBy && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            ✓ Answered by {message.answeredBy}
          </p>
        )}
      </div>
    </motion.div>
  );
}
