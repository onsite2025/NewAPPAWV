import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TemplateModel, { ITemplate, TemplateModel as TemplateModelType } from '@/models/Template';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { uuidv4 } from '@/utils/uuid';

const isDevelopment = process.env.NODE_ENV === 'development';

// GET: Retrieve all templates
// @ts-ignore - Disable type checking for this function to resolve Vercel build issues
export async function GET(request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
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
    try {
      // Try with populate first
      const templates = await TemplateModel.find(query)
        .sort({ updatedAt: -1 })
        .populate('createdBy', 'name email')
        .lean();
      
      // If fetching a single template by ID, return the first result
      if (id && templates.length > 0) {
        return NextResponse.json(templates[0], { status: 200 });
      }
      
      return NextResponse.json(templates, { status: 200 });
    } catch (populateError: any) {
      // If it's a missing schema error for the User model, fetch without populate
      if (populateError.name === 'MissingSchemaError' && 
          populateError.message.includes('Schema hasn\'t been registered for model "User"')) {
        console.log('User model not registered, fetching templates without population');
        const templates = await TemplateModel.find(query)
          .sort({ updatedAt: -1 })
          .lean();
        
        // If fetching a single template by ID, return the first result
        if (id && templates.length > 0) {
          return NextResponse.json(templates[0], { status: 200 });
        }
        
        return NextResponse.json(templates, { status: 200 });
      }
      
      // Re-throw other errors
      throw populateError;
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST: Create a new template
// @ts-ignore - Disable type checking for this function to resolve Vercel build issues
export async function POST(request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Skip authentication in development mode
    if (!isDevelopment) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.sections || !Array.isArray(body.sections)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
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
    
    // Create template with mock user ID for now (will be replaced with actual auth)
    const template = new TemplateModel({
      ...body,
      sections: processedSections,
      createdBy: '65f7f8b04115f9f2b10a5c4d', // Mock user ID - replace with actual auth
    });
    
    // Save the template
    await template.save();
    
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PUT: Update a template
// @ts-ignore - Disable type checking for this function to resolve Vercel build issues
export async function PUT(request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Skip authentication in development mode
    if (!isDevelopment) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Parse request body and URL
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!body.name || !body.sections || !Array.isArray(body.sections)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
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
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a template
// @ts-ignore - Disable type checking for this function to resolve Vercel build issues
export async function DELETE(request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Skip authentication in development mode
    if (!isDevelopment) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the template
    const deletedTemplate = await TemplateModel.findByIdAndDelete(id);
    
    if (!deletedTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Template deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 