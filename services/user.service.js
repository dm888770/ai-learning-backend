// services/user.service.js - 正确的服务文件
const crypto = require('crypto');
const userRepository = require('../repositories/user.repository');
const recommendRepository = require('../repositories/recommend.repository');
const profileService = require('./profile.service');

module.exports = {
  // ========== 注册/登录 ==========
  async register({ username, password, email, phone, nickname }) {
    if (!username || !password || !email) {
      throw { statusCode: 400, message: '用户名、密码和邮箱不能为空' };
    }
    if (username.length < 3) {
      throw { statusCode: 400, message: '用户名至少需要3个字符' };
    }
    if (password.length < 6) {
      throw { statusCode: 400, message: '密码至少需要6个字符' };
    }
    const exist = await userRepository.findExistingByAccount(username, email);
    if (exist) {
      throw { statusCode: 400, message: '用户名或邮箱已存在' };
    }
    const md5Password = crypto.createHash('md5').update(password).digest('hex');
    const data = await userRepository.create({
      username,
      password: md5Password,
      email,
      phone,
      nickname
    });
    return data;
  },

  async login({ username, password }) {
    if (!username || !password) {
      throw { statusCode: 400, message: '用户名和密码不能为空' };
    }
    const md5Password = crypto.createHash('md5').update(password).digest('hex');
    const user = await userRepository.findForLogin(username, md5Password);
    if (!user) {
      throw { statusCode: 401, message: '用户名或密码错误' };
    }
    if (!user.is_active) {
      throw { statusCode: 403, message: '账号已被禁用，请联系管理员' };
    }
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    return { ...user, token };
  },

  async getUserInfo(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: '用户不存在' };
    }
    return user;
  },

  // ========== 兴趣标签 ==========
  async saveInterestTags(userId, tags) {
    if (!tags || !tags.length) {
      return { added: [], removed: [] };
    }
    await recommendRepository.deleteLabelsBySource(userId, 'interest');
    for (const tag of tags) {
      await recommendRepository.insertLabel(userId, tag, 1.0, 'interest');
    }
    await profileService.generateProfile(userId);
    return { added: tags, removed: [] };
  },

  async batchSaveTags(userId, tags) {
    if (!tags || !tags.length) {
      return { added: [], removed: [] };
    }
    const existing = await recommendRepository.findLabels(userId, 'interest');
    const existingNames = new Set(existing.map(e => e.label_name));
    const newTags = tags.filter(t => !existingNames.has(t));
    const tagsToDelete = Array.from(existingNames).filter(name => !tags.includes(name));

    for (const tagName of newTags) {
      await recommendRepository.insertLabel(userId, tagName, 1.0, 'interest');
    }
    if (tagsToDelete.length) {
      await recommendRepository.deleteLabelsByNames(userId, 'interest', tagsToDelete);
    }
    await profileService.generateProfile(userId);
    return { added: newTags, removed: tagsToDelete, total: tags.length };
  },

  async getInterestTags(userId) {
    const rows = await recommendRepository.findLabels(userId, 'interest');
    return rows.map(r => r.label_name);
  },

  async getInterestTagsDetailed(userId) {
    const rows = await recommendRepository.findLabels(userId, 'interest');
    return {
      simple: rows.map(r => r.label_name),
      detailed: rows.map(r => ({
        id: r.id,
        name: r.label_name,
        weight: r.label_weight,
        source: r.source,
        createTime: r.create_time
      }))
    };
  },

  async updateTagWeight(userId, labelName, increment = 0.1) {
    await recommendRepository.incrementLabelWeight(userId, labelName, increment, 'interest');
    await profileService.generateProfile(userId);
  },

  async deleteTag(userId, labelName) {
    await recommendRepository.deleteLabelsByNames(userId, 'interest', [labelName]);
    await profileService.generateProfile(userId);
  },

  // ========== 语音分析 ==========
  async saveVoiceAnalysis(userId, voiceText, voiceAnalysis) {
    const testRepository = require('../repositories/test.repository');
    await testRepository.create({
      userId,
      testType: 'voice',
      userScore: 0,
      knowledgeDetail: { voice_text: voiceText, voice_analysis: voiceAnalysis }
    });
    await profileService.generateProfile(userId);
  },

  async getVoiceAnalysis(userId) {
    const testRepository = require('../repositories/test.repository');
    const row = await testRepository.findLatest(userId, ['voice']);
    if (!row) return null;
    const { safeParse } = require('../utils/json');
    const data = safeParse(row.knowledge_detail, {});
    return {
      voice_text: data.voice_text,
      voice_analysis: data.voice_analysis
    };
  },

  // ========== 试卷扫描 ==========
  async saveScanResult(userId, scanItems, scanRecommendation) {
    const testRepository = require('../repositories/test.repository');
    await testRepository.create({
      userId,
      testType: 'scan',
      userScore: 0,
      knowledgeDetail: { scan_items: scanItems, scan_recommendation: scanRecommendation }
    });
    await profileService.generateProfile(userId);
  },

  async getScanResult(userId) {
    const testRepository = require('../repositories/test.repository');
    const row = await testRepository.findLatest(userId, ['scan']);
    if (!row) return null;
    const { safeParse } = require('../utils/json');
    const data = safeParse(row.knowledge_detail, {});
    return {
      scan_items: data.scan_items,
      scan_recommendation: data.scan_recommendation
    };
  }
};