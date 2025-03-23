require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
async function testCreateTemplate() {
  console.log('Starting testCreateTemplate script...');
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using URI:', process.env.MONGODB_URI ? 'URI found in env' : 'URI not found in env');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');
    
    console.log('Defining schemas...');
    // Define the Template schema
    const OptionSchema = new mongoose.Schema({
      value: { type: String, required: true },
      label: { type: String, required: true }
    });
    
    const QuestionSchema = new mongoose.Schema({
      id: { type: String, required: true },
      text: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['text', 'multipleChoice', 'numeric', 'date', 'boolean'],
        required: true 
      },
      required: { type: Boolean, default: false },
      options: [OptionSchema]
    }, { _id: false });
    
    const SectionSchema = new mongoose.Schema({
      id: { type: String, required: true },
      title: { type: String, required: true },
      description: String,
      questions: [QuestionSchema]
    }, { _id: false });
    
    const TemplateSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      sections: [SectionSchema],
      isActive: { type: Boolean, default: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      version: { type: Number, default: 1 }
    }, { 
      timestamps: true 
    });
    
    console.log('Creating models...');
    // Create model
    const Template = mongoose.models.Template || mongoose.model('Template', TemplateSchema);
    
    // Find user to use as createdBy
    const User = mongoose.models.User || mongoose.model('User', {
      name: String,
      email: String,
      password: String
    });
    
    console.log('Finding demo user...');
    const user = await User.findOne({ email: 'demo@example.com' });
    
    if (!user) {
      console.error('Demo user not found. Please run createDemoUser.js first.');
      await mongoose.connection.close();
      return;
    }
    
    console.log('Found user:', user._id.toString());
    
    // Create a sample template
    console.log('Creating sample template data...');
    const sampleTemplate = {
      name: 'Annual Wellness Visit Template',
      description: 'Standard template for annual wellness visits',
      isActive: true,
      createdBy: user._id,
      sections: [
        {
          id: uuidv4(),
          title: 'General Health',
          description: 'Assessment of overall health status',
          questions: [
            {
              id: uuidv4(),
              text: 'How would you rate your overall health?',
              type: 'multipleChoice',
              required: true,
              options: [
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' }
              ]
            },
            {
              id: uuidv4(),
              text: 'Have you experienced any significant health changes in the past year?',
              type: 'boolean',
              required: true
            }
          ]
        },
        {
          id: uuidv4(),
          title: 'Lifestyle Habits',
          description: 'Assessment of lifestyle factors affecting health',
          questions: [
            {
              id: uuidv4(),
              text: 'How often do you exercise per week?',
              type: 'multipleChoice',
              required: true,
              options: [
                { value: 'never', label: 'Never' },
                { value: '1-2', label: '1-2 times' },
                { value: '3-4', label: '3-4 times' },
                { value: '5+', label: '5+ times' }
              ]
            },
            {
              id: uuidv4(),
              text: 'Do you currently smoke or use tobacco products?',
              type: 'boolean',
              required: true
            }
          ]
        }
      ]
    };
    
    console.log('Saving template to database...');
    // Create the template
    const template = new Template(sampleTemplate);
    await template.save();
    
    console.log('Template created successfully:', {
      id: template._id,
      name: template.name,
      sections: template.sections.length
    });
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error creating template:', error);
    try {
      await mongoose.connection.close();
      console.log('Connection closed after error');
    } catch (err) {
      console.error('Error closing connection:', err);
    }
  }
}

testCreateTemplate(); 