import express, { Request, Response, Router } from 'express';
import { UserService } from '../services';
import { ServiceErrorCode } from '../services/service.result';

export class UserController {

    async getUserFromSession (req: Request, res: Response): Promise<void> {
        const token = req.params.token
        try {
            const user = await UserService.getUserFromSession(token);
            if(user.errorCode == ServiceErrorCode.success){
                res.status(200).json(user.result);
            } else {
                res.status(500).send("Error fetching user");
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).send("Error fetching user");
        }
    }
    

    buildRoutes(): Router {
        const router = express.Router();
        router.get('/:token', this.getUserFromSession.bind(this));
        return router;
    }
}