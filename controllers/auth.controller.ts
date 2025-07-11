import express, { Request, Response, Router } from "express";
import { AuthService } from "../services";
import {SecurityUtils} from "../utils/crypto";

export class AuthController {
    async login(req: Request, res: Response): Promise<void> {
        let email: string = req.body.email;
        let pw: string = req.body.pw;
        try {
            const token = await AuthService.login(email, SecurityUtils.toSHA256(pw));
            if (token) {
                res.status(200).send(token);
            } else {
                res.status(500).send("BAD PW/EMAIL")
            }
        } catch (error) {
            res.status(500).send("Error login");
        }
    }

    buildRoutes(): Router {
        const router = express.Router();
        router.post('/login', this.login.bind(this));
        return router;
    }
}
