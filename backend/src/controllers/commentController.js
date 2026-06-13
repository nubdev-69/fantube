import CommentModel from '../models/Comment.js';

class CommentController {

    static async addComment(req, res, next) {
        try {
            const userId  = req.userId;
            const { videoId } = req.params;
            const { text, replyId } = req.body;

            if (!text?.trim()) {
                return res.status(400).json({ error: 'Comment text is required' });
            }

            const comment = await CommentModel.addComment({
                userId,
                videoId,
                replyId: replyId || null,
                text: text.trim()
            });

            res.status(201).json({ comment });
        } catch (error) {
            next(error);
        }
    }

    static async getComment(req, res, next) {
        try {
            const { videoId } = req.params;
            const comments = await CommentModel.getComments(videoId);
            res.status(200).json({ comments });
        } catch (error) {
            next(error);
        }
    }

    static async deleteComment(req, res, next) {
        try {
            const { commentId } = req.params;
            const userId = req.userId;

            await CommentModel.deleteComment(commentId, userId);
            res.status(200).json({ message: 'Comment deleted' });
        } catch (error) {
            next(error);
        }
    }

    static async getInteraction(req, res, next) {
        try {
            const { videoId } = req.params;
            const userId = req.userId;

            const data = await CommentModel.getInteraction(userId, videoId);
            res.json({ data });
        } catch (error) {
            next(error);
        }
    }

    static async addInteraction(req, res, next) {
        try {
            const { videoId, commentId } = req.params;
            const { interaction } = req.body;
            const userId = req.userId;

            const result = await CommentModel.addInteraction(
                userId,
                videoId,
                commentId,
                interaction
            );

            res.json({ interaction: result });
        } catch (error) {
            next(error);
        }
    }
}

export default CommentController;