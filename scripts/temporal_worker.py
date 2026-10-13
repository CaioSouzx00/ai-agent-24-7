"""Temporal Worker script for asynchronous and durable agent task orchestration (Task 5.1).

Connects to the Temporal server, registers AgentWorkflow and process_message,
and continuously polls the task queue for executions.
"""

from __future__ import annotations

import asyncio
import logging
import sys

from temporalio.client import Client
from temporalio.worker import Worker

from app.config import get_settings
from app.workflows import TASK_QUEUE, AgentWorkflow, process_message

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("temporal-worker")


async def main() -> None:
    settings = get_settings()
    temporal_address = settings.temporal_address
    log.info("Connecting to Temporal server at: %s", temporal_address)

    try:
        client = await Client.connect(temporal_address)
        log.info("Connected to Temporal server successfully.")
    except Exception as exc:
        log.error("Failed to connect to Temporal at %s: %s", temporal_address, exc)
        sys.exit(1)

    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[AgentWorkflow],
        activities=[process_message],
    )

    log.info("Starting Temporal worker on task queue: '%s'...", TASK_QUEUE)
    try:
        await worker.run()
    except (asyncio.CancelledError, KeyboardInterrupt):
        log.info("Temporal worker shutting down cleanly.")


if __name__ == "__main__":
    asyncio.run(main())
