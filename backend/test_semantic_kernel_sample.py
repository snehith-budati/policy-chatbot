import asyncio
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.ollama import OllamaChatCompletion
from semantic_kernel.functions import kernel_function

class PolicyPlugin:

    @kernel_function(
        name="get_attendance_rules",
        description="Returns SRM AP attendance rules."
    )
    def get_attendance_rules(self) -> str:
        return (
            "SRM University AP Attendance Policy:\n"
            "• Minimum required attendance: 75% per course for semester exams.\n"
            "• Medical/Duty Leave condonation: Up to 10% with Dean approval.\n"
            "• Below 65% attendance results in course detention."
        )

    @kernel_function(
        name="get_curfew_rules",
        description="Returns hostel curfew timings."
    )
    def get_curfew_rules(self) -> str:
        return (
            "Hostel Curfew Policy:\n"
            "• Weekdays: 8:30 PM.\n"
            "• Weekends: 9:00 PM with approved out-pass."
        )

async def main():
    # Setup semantic kernel instance
    kernel = Kernel()

    # Configure ollama service
    ollama_service = OllamaChatCompletion(
        service_id="ollama_chat",
        ai_model_id="phi3:mini",
        host="http://localhost:11434"
    )
    kernel.add_service(ollama_service)

    # Register policy plugin
    kernel.add_plugin(PolicyPlugin(), plugin_name="PolicyService")

    # Run direct plugin call
    attendance_func = kernel.get_function(plugin_name="PolicyService", function_name="get_attendance_rules")
    direct_output = await kernel.invoke(attendance_func)
    print("Direct Function Result:")
    print(direct_output)

    # Run prompt invocation through kernel
    prompt = (
        "Context:\n{{PolicyService.get_attendance_rules}}\n\n"
        "Question: What is the attendance requirement?\n"
        "Answer:"
    )

    try:
        response = await kernel.invoke_prompt(prompt=prompt)
        print("\nKernel Response:")
        print(response)
    except Exception as err:
        print(f"\nLLM Execution Error: {err}")

if __name__ == "__main__":
    asyncio.run(main())
