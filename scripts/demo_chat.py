"""Interactive CLI demo for chatting with the AI Agent 24/7 (Task 8).

Usage:
    python scripts/demo_chat.py
"""

from __future__ import annotations

import sys
import uuid

import httpx

BASE_URL = "http://localhost:8080"


def main() -> None:
    session_id = f"cli_{uuid.uuid4().hex[:6]}"
    print("=" * 60)
    print("🤖 Bem-vindo ao AI Agent 24/7 - Demo Interativa")
    print(f"Sessão ID: {session_id}")
    print("Digite sua mensagem ou 'sair' para encerrar.")
    print("Dicas de teste:")
    print(" - 'Pesquise na web as últimas notícias de tecnologia'")
    print(" - 'Qual o status das issues no repositório octocat/Hello-World?'")
    print(" - 'Quero meu reembolso imediatamente e falar com um humano!' (Handoff)")
    print("=" * 60)

    with httpx.Client(base_url=BASE_URL, timeout=60.0) as client:
        # Check health first
        try:
            r = client.get("/health")
            if not r.is_success:
                print(f"⚠️ Servidor em {BASE_URL} retornou status {r.status_code}.")
        except Exception:
            print(f"❌ Não foi possível conectar ao servidor em {BASE_URL}.")
            print("Certifique-se de que o uvicorn está rodando: uvicorn app.main:app --port 8080")
            sys.exit(1)

        while True:
            try:
                user_msg = input("\n👤 Você: ").strip()
                if not user_msg:
                    continue
                if user_msg.lower() in ("sair", "exit", "quit"):
                    print("Até logo!")
                    break

                resp = client.post("/chat", json={"session_id": session_id, "message": user_msg})
                if not resp.is_success:
                    print(f"❌ Erro da API ({resp.status_code}): {resp.text}")
                    continue

                data = resp.json()
                if data.get("paused"):
                    print("⏸️ [Bot Pausado]: Um atendente humano está com o controle deste chamado.")
                elif data.get("handoff"):
                    print(f"🚨 [Transbordo Acionado]: {data.get('response')}")
                    print("➡️ Abra http://localhost:8080/handoff/ui para responder como humano!")
                else:
                    print(f"🤖 Agente: {data.get('response')}")
            except (KeyboardInterrupt, EOFError):
                print("\nEncerrado.")
                break


if __name__ == "__main__":
    main()
