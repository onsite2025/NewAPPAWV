import mongoose from 'mongoose';
import TemplateModel from '@/models/Template';
import { uuidv4 } from '@/utils/uuid';

// Configuration for static export
export const dynamic = 'force-dynamic';
export const revalidate = 0; // This means always revalidate

const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function to create response with CORS headers
function createResponse(data: any, status: number = 200) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  return new Response(JSON.stringify(data), { 
    status,
    headers
  });
}

// GET: Retrieve all templates
export async function GET(request: Request) {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready');
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    
    // Build query
    const query: any = {};
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (id) {
      query._id = id;
    }
    
    // Fetch templates from the database
    const templates = await TemplateModel.find(query)
      .sort({ updatedAt: -1 })
      .lean();
    
    // If fetching a single template by ID, return the first result
    if (id && templates.length > 0) {
      return createResponse(templates[0]);
    }
    
    return createResponse(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return createResponse(
      { error: 'Failed to fetch templates' },
      500
    );
  }
}

// POST: Create a new template
export async function POST(request: Request) {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready');
    }
    
    // Parse request body
    const body = await request.json();
    
    // Log the request body for debugging
    console.log('Template creation request body:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.name || !body.sections || !Array.isArray(body.sections)) {
      console.log('Validation failed: Missing required fields');
      return createResponse(
        { error: 'Missing required fields' },
        400
      );
    }
    
    // Generate IDs for sections and questions if not provided
    const processedSections = body.sections.map((section: any) => {
      const sectionId = section.id || uuidv4();
      
      // Process questions
      const questions = section.questions?.map((question: any) => {
        return {
          ...question,
          id: question.id || uuidv4()
        };
      }) || [];
      
      return {
        ...section,
        id: sectionId,
        questions
      };
    });
    
    // Log processed sections for debugging
    console.log('Processed sections:', JSON.stringify(processedSections, null, 2));
    
    // Create template
    const template = new TemplateModel({
      ...body,
      sections: processedSections,
      isActive: body.isActive || false,
      version: body.version || 1
    });
    
    // Log validation errors if any
    const validationError = template.validateSync();
    if (validationError) {
      console.error('Template validation error:', validationError);
      return createResponse(
        { error: 'Template validation failed', details: validationError },
        400
      );
    }
    
    // Save the template
    await template.save();
    
    return createResponse(template, 201);
  } catch (error) {
    console.error('Error creating template:', error);
    return createResponse(
      { error: 'Failed to create template', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}

// PUT: Update a template
export async function PUT(request: Request) {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready');
    }
    
    // Parse request body and URL
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return createResponse(
        { error: 'Template ID is required' },
        400
      );
    }
    
    // Validate required fields
    if (!body.name || !body.sections || !Array.isArray(body.sections)) {
      return createResponse(
        { error: 'Missing required fields' },
        400
      );
    }
    
    // Process sections and questions
    const processedSections = body.sections.map((section: any) => {
      const sectionId = section.id || uuidv4();
      
      // Process questions
      const questions = section.questions?.map((question: any) => {
        return {
          ...question,
          id: question.id || uuidv4()
        };
      }) || [];
      
      return {
        ...section,
        id: sectionId,
        questions
      };
    });
    
    // Update the template
    const updatedTemplate = await TemplateModel.findByIdAndUpdate(
      id,
      {
        ...body,
        sections: processedSections,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedTemplate) {
      return createResponse(
        { error: 'Template not found' },
        404
      );
    }
    
    return createResponse(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    return createResponse(
      { error: 'Failed to update template' },
      500
    );
  }
}

// DELETE: Delete a template
export async function DELETE(request: Request) {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready');
    }
    
    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return createResponse(
        { error: 'Template ID is required' },
        400
      );
    }
    
    // Delete the template
    const deletedTemplate = await TemplateModel.findByIdAndDelete(id);
    
    if (!deletedTemplate) {
      return createResponse(
        { error: 'Template not found' },
        404
      );
    }
    
    return createResponse({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return createResponse(
      { error: 'Failed to delete template' },
      500
    );
  }
} 