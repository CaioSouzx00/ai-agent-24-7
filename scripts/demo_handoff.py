"""Automated demonstration of the Human Handoff lifecycle (Task 8).

Usage:
    python scripts/demo_handoff.py
"""

from __future__ import annotations

import sys
import time

import httpx

BASE_URL = "http://localhost:8080"


def main() -> None:
    session_id = f"demo_handoff_{int(time.time())}"
    print("=" * 65)
    print("🚨 Demonstração Automática do Ciclo de Transbordo Humano (Handoff)")
    print(f"Sessão de teste: {session_id}")
    print("=" * 65)

    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        # Step 1: Customer sends a sensitive trigger message
        print("\n1️⃣ [Cliente]: 'Quero meu reembolso e falar com um atendente!'")
        r1 = client.post(
            "/chat",
            json={
                "session_id": session_id,
                "message": "Quero meu reembolso e falar com um atendente!",
            },
        )
        data1 = r1.json()
        print(f"   🤖 Resposta do Bot: {data1.get('response')}")
        print(f"   🚩 Handoff ativado: {data1.get('handoff')} | Pausado: {data1.get('paused')}")
        assert data1.get("handoff") is True, "Handoff deveria ter sido ativado!"

        # Step 2: Customer sends another message while paused
        print("\n2️⃣ [Cliente insiste]: 'Tem alguém aí para me atender?'")
        r2 = client.post(
            "/chat", json={"session_id": session_id, "message": "Tem alguém aí para me atender?"}
        )
        data2 = r2.json()
        print(
            f"   🤫 Resposta do Bot: '{data2.get('response')}' (Vazio! O bot respeita o silêncio)"
        )
        print(f"   ⏸️ Bot Pausado: {data2.get('paused')}")
        assert data2.get("paused") is True, "Bot deveria estar pausado!"

        # Step 3: Fetch the created ticket via /handoff/tickets
        print("\n3️⃣ [Operador Humano]: Consulta lista de chamados em /handoff/tickets...")
        tickets = client.get("/handoff/tickets?status=open").json()
        matching = [t for t in tickets if t.get("session_id") == session_id]
        if not matching:
            print("❌ Erro: Ticket não encontrado na fila aberta!")
            sys.exit(1)
        ticket = matching[0]
        tid = ticket["id"]
        print(f"   🎫 Ticket: ID={tid} | Status={ticket['status']} | Motivo={ticket['reason']}")
        print(f"   📝 Mensagens gravadas: {len(ticket['messages'])} mensagens")

        # Step 4: Claim ticket
        print(f"\n4️⃣ [Operador Humano]: Atendente 'Caio' assume o chamado {tid}...")
        claimed = client.post(f"/handoff/tickets/{tid}/claim", json={"assignee": "Caio"}).json()
        print(f"   👤 Novo status: {claimed['status']} | Responsável: {claimed['assignee']}")

        # Step 5: Operator replies to customer
        print("\n5️⃣ [Operador Humano]: Envia resposta ao cliente através da API...")
        reply_res = client.post(
            f"/handoff/tickets/{tid}/reply",
            json={
                "text": "Olá! Sou o Caio do suporte. Já estornei o valor para você!",
                "assignee": "Caio",
            },
        ).json()
        print(f"   📤 Mensagem enviada para o canal: entregue={reply_res.get('delivered')}")

        # Step 6: Resolve ticket
        print(f"\n6️⃣ [Operador Humano]: Finaliza o chamado {tid} ('Resolve')...")
        resolved = client.post(f"/handoff/tickets/{tid}/resolve").json()
        print(f"   ✅ Chamado finalizado com status: {resolved['status']}")

        print("\n" + "=" * 65)
        print("🎉 CICLO DE TRANSBORDO CONCLUÍDO COM SUCESSO!")
        print("Você também pode visualizar tudo visualmente em: http://localhost:8080/handoff/ui")
        print("=" * 65)


if __name__ == "__main__":
    main()
