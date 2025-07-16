const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Village name is required'],
    trim: true,
    unique: true,
    maxlength: [200, 'Village name cannot exceed 200 characters'] // Increased for Gujarati text
  },
  englishName: {
    type: String,
    required: [true, 'English village name is required'],
    trim: true,
    maxlength: [100, 'English village name cannot exceed 100 characters']
  },
  gujaratiName: {
    type: String,
    trim: true,
    maxlength: [100, 'Gujarati village name cannot exceed 100 characters']
  },
  villageCode: {
    type: String,
    required: [true, 'Village code is required'],
    trim: true,
    unique: true,
    uppercase: true,
    maxlength: [10, 'Village code cannot exceed 10 characters']
  },
  status: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This will automatically handle createdAt and updatedAt
});

// Common English to Gujarati village name mappings
const englishToGujarati = {
  // Major cities and towns in Gujarat
  'ahmedabad': 'અમદાવાદ',
  'surat': 'સુરત',
  'vadodara': 'વડોદરા',
  'rajkot': 'રાજકોટ',
  'bhavnagar': 'ભાવનગર',
  'jamnagar': 'જામનગર',
  'junagadh': 'જુનાગઢ',
  'gandhinagar': 'ગાંધીનગર',
  'anand': 'આનંદ',
  'bharuch': 'ભરૂચ',
  'mehsana': 'મહેસાણા',
  'morbi': 'મોરબી',
  'nadiad': 'નડિયાદ',
  'surendranagar': 'સુરેન્દ્રનગર',
  'gandhidham': 'ગાંધીધામ',
  'ankleshwar': 'અંકલેશ્વર',
  'botad': 'બોટાદ',
  'parvala': 'પરવાળા',
  'lathi': 'લાથી',
  'gariyadhar': 'ગરિયાધાર',
  'veraval': 'વેરાવળ',
  'porbandar': 'પોરબંદર',
  'dwarka': 'દ્વારકા',
  'okha': 'ઓખા',
  'kutch': 'કચ્છ',
  'bhuj': 'ભુજ',
  'mundra': 'મુંદ્રા',
  'adipur': 'આદિપુર',
  'anjar': 'અંજાર',
  'rapar': 'રાપર',
  'nakhatrana': 'નખત્રાણા',
  'mandvi': 'માંડવી',
  'halvad': 'હળવદ',
  'dhrangadhra': 'ધ્રાંગધ્રા',
  'wadhwan': 'વઢવાણ',
  'chotila': 'છોટીલા',
  'tankara': 'તંકારા',
  'gondal': 'ગોંડલ',
  'jetpur': 'જેતપુર',
  'upleta': 'ઉપલેટા',
  'dhoraji': 'ધોરાજી',
  'keshod': 'કેશોદ',
  'mangrol': 'મંગરોળ',
  'una': 'ઉના',
  'talala': 'તળાળા',
  'kodinar': 'કોડીનાર',
  'khambhalia': 'ખંભાળિયા',
  'kalawad': 'કાલાવાડ',
  'kalavad': 'કાલાવાડ',
  'wankaner': 'વાંકાનેર',
  'paddhari': 'પદ્ધરી',
  'jasdan': 'જસદણ',
  'vinchhiya': 'વિંછિયા',
  'lodhika': 'લોઢીકા',
  'morvi': 'મોરવી',
  'maliya': 'માળિયા',
  'tankara': 'તંકારા',
  'rajula': 'રાજુલા',
  'mahuva': 'માહુવા',
  'talaja': 'તળાજા',
  'palitana': 'પાલિતાણા',
  'ghogha': 'ઘોઘા',
  'sihor': 'સિહોર',
  'umrala': 'ઉમરાળા',
  'vallabhipur': 'વલ્લભીપુર',
  'gadhada': 'ગઢડા',
  'barvala': 'બરવાળા',
  'dhasa': 'ધસા',
  'savarkundla': 'સાવરકુંડલા',
  'amreli': 'અમરેલી',
  'bagasara': 'બગસરા',
  'dhari': 'ધારી',
  'khambha': 'ખંભા',
  'lilia': 'લીલિયા',
  'rajula': 'રાજુલા',
  'babra': 'બાબરા',
  'kunkavav': 'કુંકાવાવ',
  'vadia': 'વડિયા'
};

// Function to get Gujarati translation
villageSchema.statics.getGujaratiTranslation = function(englishName) {
  const cleanName = englishName.toLowerCase().trim();
  return englishToGujarati[cleanName] || null;
};

// Function to create display name with Gujarati translation
villageSchema.statics.createDisplayName = function(englishName, gujaratiName = null) {
  const gujaratiTranslation = gujaratiName || this.getGujaratiTranslation(englishName);
  
  if (gujaratiTranslation) {
    return `${englishName} (${gujaratiTranslation})`;
  }
  
  return englishName; // Return original name if no translation found
};

// Function to generate village code from village name
villageSchema.statics.generateVillageCode = function(villageName) {
  // Use only English name for code generation (remove Gujarati part if present)
  const englishOnly = villageName.split('(')[0].trim();
  
  // Remove spaces and convert to lowercase
  const cleanName = englishOnly.toLowerCase().replace(/\s+/g, '');
  
  // Extract consonants (skip vowels: a, e, i, o, u)
  const consonants = cleanName.replace(/[aeiou]/g, '');
  
  // Take first 2 consonants and make uppercase
  if (consonants.length >= 2) {
    return consonants.substring(0, 2).toUpperCase();
  }
  
  // Fallback: if less than 2 consonants, use first 2 characters
  return cleanName.substring(0, 2).toUpperCase();
};

// Function to generate unique village code (handles duplicates)
villageSchema.statics.generateUniqueVillageCode = async function(villageName) {
  const baseCode = this.generateVillageCode(villageName);
  
  // Check if code already exists
  const existingVillage = await this.findOne({ villageCode: baseCode });
  
  if (!existingVillage) {
    return baseCode;
  }
  
  // If duplicate, find all codes with the same base and add number suffix
  const similarCodes = await this.find({ 
    villageCode: { $regex: `^${baseCode}` } 
  }).select('villageCode').sort({ villageCode: 1 });
  
  let counter = 1;
  let newCode = `${baseCode}${counter}`;
  
  // Find the next available number
  while (similarCodes.some(village => village.villageCode === newCode)) {
    counter++;
    newCode = `${baseCode}${counter}`;
  }
  
  return newCode;
};

// Pre-save middleware to update the updatedAt field
villageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-update middleware to update the updatedAt field
villageSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const Village = mongoose.model('Village', villageSchema);

module.exports = Village;