/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-08-08 23:13:13
 * @LastEditors: cejay
 * @LastEditTime: 2022-08-15 21:55:24
 */
/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-08-08 22:46:45
 * @LastEditors: cejay
 * @LastEditTime: 2022-08-08 23:06:55
 */
import { ResponseToolkit } from "@hapi/hapi";
import { HttpPOSTRequest, HttpPOSTResponse, HttpPOSTResponseCode } from "../entity/httpReqResp";
import { UserOperation } from '../entity/userOperation';
import { getPayMasterSignHash, signPayMasterHash } from "../utils/userOp";
import { YamlConfig } from "../utils/yamlConfig";
import { Utils } from "../utils/utils";

export class PaymasterRoute {
    public static async handler(request: Request, h: ResponseToolkit, err?: Error | undefined) {
        const resp = new HttpPOSTResponse(HttpPOSTResponseCode.success, '');
        let req: HttpPOSTRequest | undefined = undefined;
        try {
            req = await request.json() as HttpPOSTRequest;
            if (!req || !req.data) {
                resp.code = HttpPOSTResponseCode.unknownDataError;
            } else {
                const opArr = req.data as UserOperation[];
                if (!opArr) {
                    resp.code = HttpPOSTResponseCode.unknownDataError;
                } else if (!Array.isArray(opArr) || opArr.length === 0) {
                    resp.code = HttpPOSTResponseCode.unknownDataError;
                } else {
                    switch (req.method) {
                        case 'sign':
                            for (const op of opArr) {
                                const verifyResult = await Utils.verifyUserOperation(op);
                                if (!verifyResult.valid) {
                                    resp.code = HttpPOSTResponseCode.dataCanNotVerifyError;
                                    resp.msg = verifyResult.error;
                                    return;
                                } else if (op.paymaster.toLocaleLowerCase() != YamlConfig.getInstance().paymaster.paymasterAddress) {
                                    resp.code = HttpPOSTResponseCode.unknownPayMaster;
                                    return;
                                }
                            }
                            const signArr = [];
                            for (const op of opArr) {
                                signArr.push(PaymasterRoute._sign(op));
                            }
                            const signData = await Promise.all(signArr);
                            resp.data = signData;
                            break;
                        default:
                            resp.code = HttpPOSTResponseCode.unknownMethodError;
                            break;
                    }
                }

            }


        } catch (error) {
            console.log(error);
            resp.code = HttpPOSTResponseCode.unknownError;
        }


        h.response(resp).code(200);
    }

    private static _sign(op: UserOperation): {
        succ: boolean,
        paymasterData: string,
        error: string
    } {
        try {
            const paymasterSignHash = getPayMasterSignHash(op);
            const paymasterData = signPayMasterHash(paymasterSignHash, YamlConfig.getInstance().paymaster.signatureKey);
            return {
                succ: true,
                paymasterData: paymasterData,
                error: ''
            };
        } catch (error) {
            return {
                succ: false,
                paymasterData: '0x',
                error: 'sign error'
            };
        }
    }



}