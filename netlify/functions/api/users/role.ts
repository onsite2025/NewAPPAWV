import { Handler } from '@netlify/functions';
import connectToDatabase from '../../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';
import User from '../../../../src/models/User';

export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { userId } = event.queryStringParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    await connectToDatabase();
    const user = await User.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        role: user.role || 'staff',
        id: user._id,
        email: user.email
      })
    };
  } catch (error) {
    console.error('Error fetching user role:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch user role' })
    };
  }
}; 