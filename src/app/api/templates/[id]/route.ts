import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Template from '@/models/Template';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { uuidv4 } from '@/utils/uuid';

const isDevelopment = process.env.NODE_ENV === 'development';

// GET: Retrieve a specific template
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    // Skip authentication in development mode
    if (!isDevelopment) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const { id } = context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }
    
    try {
      // Try with populate first
      const template = await Template.findById(id)
        .populate('createdBy', 'name email')
        .lean();
      
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      
      return NextResponse.json(template);
    } catch (populateError: any) {
      // If it's a missing schema error for the User model, fetch without populate
      if (populateError.name === 'MissingSchemaError' && 
          populateError.message.includes('Schema hasn\'t been registered for model "User"')) {
        console.log('User model not registered, fetching template without population');
        const template = await Template.findById(id).lean();
        
        if (!template) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        
        return NextResponse.json(template);
      }
      
      // Re-throw other errors
      throw populateError;
    }
  } catch (error) {
    console.error(`Error fetching template ${context.params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT: Update a template
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    // Skip authentication in development mode
    if (!isDevelopment) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const { id } = context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.sections || !Array.isArray(body.sections)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Process sections to ensure all have IDs
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
    
    // Update template
    const updatedTemplate = await Template.findByIdAndUpdate(
      id,
      { 
        ...body, 
        sections: processedSections,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error(`Error updating template ${context.params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a template (mark as inactive)
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    // Skip authentication in development mode
    if (!isDevelopment) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const { id } = context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }
    
    // Soft delete (mark as inactive)
    const deletedTemplate = await Template.findByIdAndDelete(id);
    
    if (!deletedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error(`Error deleting template ${context.params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
} 