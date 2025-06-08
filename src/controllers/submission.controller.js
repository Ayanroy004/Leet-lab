import { db } from "../libs/db.js";


export const getAllSubmissions = async (req, res) => {
  try {
    const userId = req.user.id;

    const submission = await db.submission.findMany({
      where: {
        userId: userId
      }
    })

    if (!submission || submission.length === 0) {
      return res.status(404).json({ error: "No submissions found" });
    }

    return res.status(200).json({
      success: true,
      message: "All submissions fetched successfully",
      data: submission
    });

  } catch (error) {
    console.error("Error fetching submissions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submissions",
      error: error.message
    });
  }
}

export const getSubmissionForProblem = async (req, res) => {
  try {
    
    const userId = req.user.id;
    const problemId = req.params.problemId;

    if (!problemId) {
      return res.status(400).json({ error: "Problem ID is required" });
    }

    const submission = await db.submission.findMany({
      where: {
        userId: userId,
        problemId: problemId
      }
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found for this problem" });
    }

    return res.status(200).json({
      success: true,
      message: "Submission fetched successfully",
      data: submission
    });

  } catch (error) {
    console.error("Error fetching submission for problem:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submission for problem",
      error: error.message
    });
    
  }
}

export const getAllTheSubmissionsForProblem = async (req, res) => {
  try {
    
    const userId = req.user.id;
    const problemId = req.params.problemId;

    if (!problemId) {
      return res.status(400).json({ error: "Problem ID is required" });
    }

    const submissionCount = await db.submission.count({
      where: {
        userId: userId,
        problemId: problemId
      }
    });

    return res.status(200).json({
      success: true,
      message: "Submission count fetched successfully",
      data: { count: submissionCount }
    });

  } catch (error) {
    console.error("Error fetching submission count for problem:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submission count for problem",
      error: error.message
    });
  }
}