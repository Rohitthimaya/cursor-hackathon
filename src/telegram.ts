/**
 * Telegram Bot API - send messages to users
 * Used when we receive webhook updates and need to reply with AI response
 */

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<boolean> {
  if (!botToken || !chatId || !text) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4096),
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[Telegram] sendMessage error:", e);
    return false;
  }
}
