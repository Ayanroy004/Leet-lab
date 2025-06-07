import { pollBatchResults, submitBatch } from "../libs/judge0.lib.js";

export const executeCode = async (req, res) => {
  try {
    const { source_code, language_id, stdin, expected_output, problem_id } =
      req.body;
    const userId = req.user.id;

    // Validate input

    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_output) ||
      expected_output.length !== stdin.length
    ) {
      return res.status(400).json({ error: "Invalid input format" });
    }

    // 2. Prepare the test cases for the Judge0 API
    const submissions = stdin.map((input, output)=>{
      return {
        source_code,
        language_id,
        stdin: input,
      }
    })

    // 3. Send the submissions to the Judge0 API

    const submittedSubmissions = await submitBatch(submissions);


    if (!submittedSubmissions || submittedSubmissions.length === 0) {
      return res.status(500).json({ error: "Failed to submit code for execution" });
    }

    // 4. Extract the tokens from the submitted submissions

    const tokens = submittedSubmissions.map((submission)=>{
      return submission.token;
    })


    // 5. Poll for the results of the submissions
    const results = await pollBatchResults(tokens);
    if (!results || results.length === 0) {
      return res.status(500).json({ error: "Failed to get results from Judge0" });
    }

    console.log("Batch result after polling:", results);
    // 6. Check if the output matches the expected output

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if ( result.stdout !== expected_output[i]) {
        console.log(`Output does not match expected output for input ${stdin[i]}`);

        return res.status(400).json({
          message: `Output does not match expected output for input ${stdin[i]}`,
          input: stdin[i],
          expected_output: expected_output[i],
          output: result.stdout || result.stderr,
          status: result.status.description,
          time: result.time,
          memory: result.memory,
        });
      }
    }

    res.status(200).json({
      message: "Code executed successfully",
      results: results.map((result, index) => ({
        input: stdin[index],
        expected_output: expected_output[index],
        output: result.stdout || result.stderr,
        status: result.status.description,
        time: result.time,
        memory: result.memory,
      })),
    });

  } catch (error) {
    console.error("Error executing code:", error);
    res.status(500).json({
      error: "An error occurred while executing the code",
      details: error.message,
    });
  }
};
