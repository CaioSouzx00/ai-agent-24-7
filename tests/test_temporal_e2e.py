"""End-to-end validation of Temporal worker and workflow execution (Task 5.1 & 5.2)."""

from __future__ import annotations

import pytest
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from app.workflows import TASK_QUEUE, AgentWorkflow, process_message


@pytest.mark.asyncio
async def test_temporal_workflow_and_worker_e2e():
    """Verify that Temporal worker executes AgentWorkflow and activities end-to-end."""
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue=TASK_QUEUE,
            workflows=[AgentWorkflow],
            activities=[process_message],
        ):
            handle = await env.client.start_workflow(
                AgentWorkflow.run,
                args=["session-temporal-456", "Test message for temporal"],
                id="workflow-test-e2e-run",
                task_queue=TASK_QUEUE,
            )
            result = await handle.result()

            assert isinstance(result, dict)
            assert result["status"] == "completed"
            assert result["session_id"] == "session-temporal-456"
            assert "response" in result
            assert len(result["response"]) > 0
