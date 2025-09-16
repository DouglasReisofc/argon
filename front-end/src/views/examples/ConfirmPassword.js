/*!

=========================================================
* Argon Dashboard React - v1.1.0
=========================================================

* Product Page: https://www.creative-tim.com/product/argon-dashboard-react
* Copyright 2019 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/argon-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React, {useEffect, useState} from "react";

// reactstrap components
import {
    Button,
    Card,
    CardBody,
    FormGroup,
    Form,
    Input,
    InputGroupText,
    InputGroup,
    Col
} from "reactstrap";
import {confirmReset} from "../../network/ApiAxios";
import {useLocation, useParams} from "react-router-dom";

const ConfirmPassword = props => {

    const {id} = useParams();
    const location = useLocation();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const codeFromQuery = params.get('code');
        if (codeFromQuery) {
            setCode(codeFromQuery);
        }
    }, [location.search]);

    const confirm = async () => {
        if (password !== confirmPassword) {
            setError("Passwords have to match");
            return;
        }
        if (!code) {
            setError("Please provide the reset code from your email");
            return;
        }
        setIsSubmitting(true);
        const response = await confirmReset(id, password, code);
        const {data} = response;
        if (data.success) {
            props.history.push("/auth/reset-success");
        } else if (data.msg) {
            if (Array.isArray(data.msg)) {
                setError(data.msg[0]?.msg || "Unable to reset password");
            } else {
                setError(data.msg);
            }
        } else {
            setError("Unable to reset password");
        }
        setIsSubmitting(false);
    }

    return (
        <>
            <Col lg="5" md="7">
                <Card className="bg-secondary shadow border-0">
                    <CardBody className="px-lg-5 py-lg-5">
                        <Form role="form">
                            <FormGroup>
                                <InputGroup className="input-group-alternative">
                                    <InputGroupText>
                                        <i className="ni ni-email-83"/>
                                    </InputGroupText>
                                    <Input placeholder="Reset code" type="text" autoComplete="one-time-code" value={code}
                                           onChange={e => setCode(e.target.value)}
                                    />
                                </InputGroup>
                            </FormGroup>
                            <FormGroup>
                                <InputGroup className="input-group-alternative">
                                    <InputGroupText>
                                        <i className="ni ni-lock-circle-open"/>
                                    </InputGroupText>
                                    <Input placeholder="Password" type="password" autoComplete="new-password" value={password}
                                           onChange={e => setPassword(e.target.value)}
                                    />
                                </InputGroup>
                            </FormGroup>
                            <FormGroup>
                                <InputGroup className="input-group-alternative">
                                    <InputGroupText>
                                        <i className="ni ni-lock-circle-open"/>
                                    </InputGroupText>
                                    <Input placeholder="Confirm Password" type="password" autoComplete="new-password" value={confirmPassword}
                                           onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </InputGroup>
                            </FormGroup>
                            {error ?
                                <div className="text-muted font-italic">
                                    <small>
                                        error:{" "}
                                        <span className="text-red font-weight-700">{error}</span>
                                    </small>
                                </div> : null }
                            <div className="text-center">
                                <Button className="my-4" color="primary" type="button" onClick={confirm} disabled={isSubmitting}>
                                    {isSubmitting ? 'Working...' : 'Reset Password'}
                                </Button>
                            </div>
                        </Form>
                    </CardBody>
                </Card>
            </Col>
        </>
    );
}

export default ConfirmPassword;
