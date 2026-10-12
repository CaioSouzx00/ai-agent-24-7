"""Temporal workflows (Tasks 5.1/5.2) — skeleton."""

from datetime import timedelta

from temporalio import activity, workflow
from temporalio.common import RetryPolicy


@activity.defn
async def process_message(session_id: str, message: str) -> str:
    # TODO: call the agent graph
    return f"processed:{message}"


@workflow.defn
class AgentWorkflow:
    @workflow.run
    async def run(self, session_id: str, message: str) -> str:
        return await workflow.execute_activity(
            process_message,
            args=[session_id, message],
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=RetryPolicy(maximum_attempts=5, backoff_coefficient=2.0),
        )
