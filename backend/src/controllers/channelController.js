// src/controllers/channelController.js
// This file handles channel-related logic

import ChannelModel from '../models/Channel.js';
import VideoModel from '../models/Video.js';

class ChannelController {
  // Create channel
  static async createChannel(req, res, next) {
    try {
      const { name, description } = req.body;
      const banner = req.banner_url;

      // Check if user already has a channel
      const existingChannel = await ChannelModel.findByUserId(req.userId);
      if (existingChannel) {
        return res.status(409).json({ error: 'You already have a channel' });
      }

      // Create channel
      const channel = await ChannelModel.create({
        userId: req.userId,
        name,
        description,
        banner
      });

      res.status(201).json({
        message: 'Channel created successfully',
        channel
      });
    } catch (error) {
      next(error);
    }
  }

  // Get channel by ID
  static async getChannelById(req, res, next) {
    try {
      const { id } = req.params;
      const found = await ChannelModel.findByHandle(id);

      if (!found) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channel = await ChannelModel.getChannelInfo(id);

      res.json({ channel });
    } catch (error) {
      next(error);
    }
  }

  // Get my channel
  static async getMyChannel(req, res, next) {
    try {
      const channel = await ChannelModel.findByUserId(req.userId);

      if (!channel) {
        return res.status(404).json({ error: 'You do not have a channel' });
      }

      res.json({ channel });
    } catch (error) {
      next(error);
    }
  }

  // Update channel
  static async updateChannel(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const { name, description, links, removeBanner, featuredVideoId } = req.body;
      const banner = removeBanner ? '/uploads/banners/default-banner.png' : req.banner_url || null;


      // Check if channel exists and user owns it
      const channel = await ChannelModel.findByUserId(userId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      if (channel.user_id !== req.userId) {
        return res.status(403).json({ error: 'You do not own this channel' });
      }

      // Update channel
      const updatedChannel = await ChannelModel.update(channel.id, {
        name,
        description,
        banner,
        links: links ? JSON.parse(links) : null,
        featuredVideoId: featuredVideoId?featuredVideoId:null
      });

      if (!updatedChannel) return res.status(404).json({ error: 'Channel update failed' });

      const getChannel = await ChannelModel.getMyChannel(req.userId);

      res.json({
        message: 'Channel updated successfully',
        channel: getChannel
      });
    } catch (error) {
      next(error);
    }
  }

  // Get channel's videos
  static async getChannelVideos(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const { page, limit } = req.query;

      const channel = await ChannelModel.findByHandle(id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const videos = (channel.userId === userId)
        ? await ChannelModel.getMyChannelVideos(userId)
        : await ChannelModel.getChannelVideos(channel.userId, {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20
        });

      res.json({ videos });
    } catch (error) {
      next(error);
    }
  }

  static async getChannelHome(req, res, next) {
    try {
      const { channelId } = req.params;
      const userId = req.userId;

      const channel = await ChannelModel.findByHandle(channelId);
      const vis = channel.userId === userId ? 'private' : 'public';

      const [featuredVideo, playlists] = await Promise.all([
        ChannelModel.fetchFeaturedVideo(channelId),
        ChannelModel.getHomePlaylist(channel.channelId, vis)
      ]);

      res.json({
        featuredVideo: featuredVideo || null,
        playlists
      });

    } catch (err) {
      next(err);
    }
  }
  static async getFeaturedVideos(req, res, next) {
    try {
      const userId = req.userId;

      const videos = await ChannelModel.getFeaturedVideos(userId);

      if (videos) {
        console.log(videos)
        res.json({ videos: videos || null })
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  // Subscribe to channel
  static async subscribe(req, res, next) {
    try {
      const { videoId } = req.params;
      const userId = req.userId;

      // Check if channel exists
      // const channel= await ChannelModel.findByUserId(userId);
      const channel = await VideoModel.getChannelId(videoId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }
      // Can't subscribe to your own channel
      if (channel.channelownerid === userId) {
        return res.status(400).json({ error: 'Cannot subscribe to your own channel' });
      }

      // Check if already subscribed
      const isSubscribed = await ChannelModel.isSubscribed(userId, channel.id);

      // Subscribe

      if (isSubscribed) {
        await ChannelModel.unsubscribe(userId, channel.id);
      } else {
        await ChannelModel.subscribe(userId, channel.id);
      }




      res.json({
        subscribed: !isSubscribed,
        message: isSubscribed ? 'Unsubscribed successfully' : 'Subscribed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  static async subscribe1(req, res, next) {
    try {
      const { channelId } = req.params;
      const userId = req.userId;

      // Check if channel exists
      // const channel= await ChannelModel.findByUserId(userId);
      const channel = await ChannelModel.findByHandle(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }
      // Can't subscribe to your own channel
      if (channel.userId === userId) {
        return res.status(400).json({ error: 'Cannot subscribe to your own channel' });
      }

      // Check if already subscribed
      const isSubscribed = await ChannelModel.isSubscribed(userId, channel.channelId);

      // Subscribe

      if (isSubscribed) {
        await ChannelModel.unsubscribe(userId, channel.channelId);
      } else {
        await ChannelModel.subscribe(userId, channel.channelId);
      }




      res.json({
        subscribed: !isSubscribed,
        message: isSubscribed ? 'Unsubscribed successfully' : 'Subscribed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // static async subscribeStatus(req,res, next){
  //   try{
  //     const {videoId} = req.params;
  //     const userId=req.userId;

  //     if(!userId) return res.json({subscribed:false});

  //     const channel = await VideoModel.getChannelId(videoId);
  //     if (!channel) {
  //       return res.status(404).json({ error: 'Channel not found' });
  //     }

  //     const isSubscribed = await ChannelModel.isSubscribed(userId,channel.id);

  //     res.json({
  //       subscribed:isSubscribed
  //     })
  //   }catch(error){
  //     next(error);
  //   }
  // }

  static async subscribeStatus(req, res, next) {
    try {
      const { channelId } = req.params;
      const userId = req.userId;

      if (!userId) return res.json({ subscribed: false });

      const channel = await ChannelModel.findByHandle(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const isSubscribed = await ChannelModel.isSubscribed(userId, channel.channelId);
      res.json({
        subscribed: isSubscribed
      })
    } catch (error) {
      next(error);
    }
  }
  // Unsubscribe from channel
  static async unsubscribe(req, res, next) {
    try {
      const { id } = req.params;

      // Check if subscribed
      const isSubscribed = await ChannelModel.isSubscribed(req.userId, id);
      if (!isSubscribed) {
        return res.status(400).json({ error: 'Not subscribed' });
      }

      // Unsubscribe
      await ChannelModel.unsubscribe(req.userId, id);

      res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Get channel subscribers
  static async getSubscribers(req, res, next) {
    try {
      const { id } = req.params;

      const channel = await ChannelModel.findById(id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const subscribers = await ChannelModel.getSubscribers(id);

      res.json({ subscribers, count: subscribers.length });
    } catch (error) {
      next(error);
    }
  }
}

export default ChannelController;