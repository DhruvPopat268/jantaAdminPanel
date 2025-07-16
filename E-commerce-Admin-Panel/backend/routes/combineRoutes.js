const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const SubCategory = require('../models/SubCategory'); // Add this line - adjust path if needed
const Banner = require('../models/bannerModel');
const Product = require('../models/product');
const jwt = require('jsonwebtoken');
const SalesAgent = require('../models/salesAgent')
const RouteSetup = require('../models/routeSetup')
const Cart = require('../models/Cart')
const verifyToken = require('../middleware/authMiddleware')

router.post('/',verifyToken, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).json({ message: "Access denied. No token provided." });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    // 1. Fetch SalesAgent with both status and routeStatus
    const agent = await SalesAgent.findById(userId);
    const salesAgentStatus = agent?.status ?? null;
    const routeSetupStatus = agent?.routeStatus ?? null; // Get routeStatus from SalesAgent model
    
    // 2. Find routeSetup where this agent is assigned (optional - for additional validation)
    const routeDoc = await RouteSetup.findOne({
      'salesAgents.agentId': userId
    });
    // You can use this for additional checks if needed
    // const routeDocStatus = routeDoc?.isActive ?? null;
    
    // 3. Count cart items for this user
    const cartCount = await Cart.countDocuments({ userId });
    
    const [categories, bannersRaw, dailyNeedsProducts] = await Promise.all([
      Category.find({ status: true }), // Only fetch categories with status: true
      Banner.find({ status: true }) // Only fetch banners with status: true
        .sort({ createdAt: -1 })
        .populate('categoryId', 'name')
        .populate('subcategoryId', 'name'),
      Product.find({ showInDailyNeeds: true })
    ]);
    
    const categoryIds = [...new Set(dailyNeedsProducts.map(p => p.category).filter(Boolean))];
    const subCategoryIds = [...new Set(dailyNeedsProducts.map(p => p.subCategory).filter(Boolean))];
    
    const [categoryDetails, subCategoryDetails] = await Promise.all([
      Category.find({ 
        _id: { $in: categoryIds },
        status: true // Only fetch active categories for product mapping
      }).select('_id name'),
      SubCategory.find({ _id: { $in: subCategoryIds } }).select('_id name')
    ]);
    
    const categoryMap = new Map(categoryDetails.map(cat => [cat._id.toString(), cat]));
    const subCategoryMap = new Map(subCategoryDetails.map(subCat => [subCat._id.toString(), subCat]));
    
    const banners = bannersRaw.map(banner => {
      const bannerObj = banner.toObject();
      return {
        ...bannerObj,
        subcategoryId: bannerObj.subcategoryId?._id || bannerObj.subcategoryId || null,
        imageUrl: bannerObj.image ? `/uploads/${bannerObj.image}` : null
      };
    });
    
    // Filter daily needs products to only include those with active categories
    const dailyneed = dailyNeedsProducts
      .filter(product => {
        // Only include products whose category has status: true
        return categoryMap.has(product.category?.toString());
      })
      .map(product => {
        const productObj = product.toObject();
        const firstAttribute = productObj.attributes && productObj.attributes.length > 0
          ? productObj.attributes[0]
          : null;
          
        const categoryDetail = categoryMap.get(productObj.category);
        const subCategoryDetail = subCategoryMap.get(productObj.subCategory);
        
        return {
          featured: productObj.featured,
          _id: productObj._id,
          productName: productObj.name,
          name: firstAttribute?.name || productObj.name,
          description: productObj.description,
          category: categoryDetail ? {
            _id: categoryDetail._id,
            name: categoryDetail.name
          } : {
            _id: productObj.category,
            name: null
          },
          subCategory: subCategoryDetail ? {
            _id: subCategoryDetail._id,
            name: subCategoryDetail.name
          } : {
            _id: productObj.subCategory,
            name: null
          },
          visibility: productObj.visibility,
          status: productObj.status,
          price: firstAttribute?.price || productObj.price,
          discountedPrice: firstAttribute?.discountedPrice || productObj.discountedPrice,
          image: productObj.images && productObj.images.length > 0 
            ? productObj.images[0] 
            : productObj.image, // Fallback for backward compatibility
          createdAt: productObj.createdAt,
          updatedAt: productObj.updatedAt,
          __v: productObj.__v,
          showInDailyNeeds: productObj.showInDailyNeeds
        };
      });
    
    res.status(200).json({
      categories,
      banners,
      dailyneed,
      salesAgentStatus,
      routeSetupStatus, // This now comes from SalesAgent.routeStatus
      cartCount
    });
    
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

module.exports = router;