import { db } from "../libs/db.js";

export const createPlaylist = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;
    if (!name || !description) {
      return res
        .status(400)
        .json({ message: "Name and description are required" });
    }

    const newPlaylist = await db.playlist.create({
      data: {
        name,
        description,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      playlist: newPlaylist,
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return res.status(500).json({
      success: false,
      message: "playlist creation failed",
      error: error.message,
    });
  }
};

export const getAllPlaylistDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const playlists = await db.playlist.findMany({
      where: { userId },
      include: {
        problems: {
          include: {
            problem: true, // Include problem details
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Playlists retrieved successfully",
      playlists,
    });
  } catch (error) {
    console.error("Error retrieving playlists:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve playlists",
      error: error.message,
    });
  }
};

export const getPlaylistDetails = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user.id;

    const playlist = await db.playlist.findUnique({
      where: { id: playlistId, userId },
      include: {
        problems: {
          include: {
            problem: true, // Include problem details
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Playlist retrieved successfully",
      playlist,
    });
  } catch (error) {
    console.error("Error retrieving playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve playlist",
      error: error.message,
    });
  }
};

export const addProblemToPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { problemIds } = req.body;
    const userId = req.user.id;
    if (!playlistId || !Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    // create a new playlist problem entry for each problemId
    const addedProblems = await db.ProblemInPlaylist.createMany({
      data: problemIds.map((problemId) => ({
        playlistId,
        problemId,
      })),
    });

    return res.status(201).json({
      success: true,
      message: "Problems added to playlist successfully",
      addedProblems,
    });
  } catch (error) {
    console.error("Error adding problems to playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add problems to playlist",
      error: error.message,
    });
  }
};

export const removeProblemFromPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { problemIds } = req.body;
    const userId = req.user.id;
    if (!playlistId || !Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    // delete the playlist problem entry
    const deletedProblem = await db.problemInPlaylist.deleteMany({
      where: {
        playlistId,
        problemId: {
          in: problemIds,
        },
      },
    });
    if (deletedProblem.count === 0) {
      return res.status(404).json({
        success: false,
        message: "No problems found in the playlist to remove",
      });
    }
    return res.status(201).json({
      success: true,
      message: "Problems removed from playlist successfully",
      deletedProblem,
    });
  } catch (error) {
    console.error("Error removing problems from playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove problems from playlist",
      error: error.message,
    });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user.id;
    if (!playlistId) {
      return res.status(400).json({
        success: false,
        message: "Playlist ID is required",
      });
    }
    // Delete the playlist and associated problems
    const deletedPlaylist = await db.playlist.delete({
      where: {
        id: playlistId,
        userId, // Ensure the user owns the playlist
      },
    });
    if (!deletedPlaylist) {
      return res.status(404).json({
        success: false,
        message:
          "Playlist not found or you do not have permission to delete it",
      });
    }
    return res.status(201).json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete playlist",
      error: error.message,
    });
  }
};
