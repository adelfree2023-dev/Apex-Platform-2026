/**
 * HQ Admin Controller
 * API endpoints for Super Admin authentication
 */

import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { HQAuthService } from './hq-auth.service';

@ApiTags('hq-auth')
@Controller('api/auth')
export class HQAuthController {
    constructor(private readonly hqAuthService: HQAuthService) { }

    /**
     * Super Admin Login
     */
    @Post('login')
    @ApiOperation({ summary: 'HQ Admin Login', description: 'Login for Super Admins' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'admin@apex.com' },
                password: { type: 'string', example: 'password123' },
            },
            required: ['email', 'password'],
        },
    })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() body: { email: string; password: string }) {
        if (!body.email || !body.password) {
            throw new HttpException('Email and password are required', HttpStatus.BAD_REQUEST);
        }

        const result = await this.hqAuthService.login(body.email, body.password);
        if (!result) {
            throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
        }

        return {
            success: true,
            user: result.user,
            accessToken: result.accessToken,
            message: 'Login successful',
        };
    }

    /**
     * Get current user info
     */
    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Current User', description: 'Get logged in user info' })
    @ApiResponse({ status: 200, description: 'User info' })
    async getCurrentUser(@Headers('authorization') auth?: string) {
        const token = auth?.replace('Bearer ', '');
        if (!token) {
            throw new HttpException('No token provided', HttpStatus.UNAUTHORIZED);
        }

        const decoded = this.hqAuthService.verifyToken(token);
        if (!decoded) {
            throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
        }

        return {
            success: true,
            user: {
                id: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            },
        };
    }

    /**
     * Get all HQ users
     */
    @Get('users')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get HQ Users', description: 'List all Super Admin users' })
    @ApiResponse({ status: 200, description: 'Users list' })
    async getUsers(@Headers('authorization') auth?: string) {
        const token = auth?.replace('Bearer ', '');
        if (!token) {
            throw new HttpException('No token provided', HttpStatus.UNAUTHORIZED);
        }

        const decoded = this.hqAuthService.verifyToken(token);
        if (!decoded || decoded.role !== 'super_admin') {
            throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
        }

        const users = await this.hqAuthService.getAllUsers();
        return {
            success: true,
            data: users,
            count: users.length,
        };
    }

    /**
     * Create new HQ user
     */
    @Post('users')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create HQ User', description: 'Create new admin user' })
    @ApiResponse({ status: 201, description: 'User created' })
    async createUser(
        @Headers('authorization') auth: string,
        @Body() body: { email: string; password: string; name: string; role: string },
    ) {
        const token = auth?.replace('Bearer ', '');
        const decoded = this.hqAuthService.verifyToken(token);
        if (!decoded || decoded.role !== 'super_admin') {
            throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
        }

        if (!body.email || !body.password || !body.name) {
            throw new HttpException('Email, password, and name are required', HttpStatus.BAD_REQUEST);
        }

        const user = await this.hqAuthService.createUser({
            email: body.email,
            password: body.password,
            name: body.name,
            role: body.role || 'admin',
        });

        return {
            success: true,
            data: user,
            message: 'User created successfully',
        };
    }
}
