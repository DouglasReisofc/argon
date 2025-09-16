import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation, useParams} from 'react-router-dom';
import {confirmRegister} from "../../network/ApiAxios";
import {Button, Card, CardBody, Col, Form, FormGroup, Input, InputGroup, InputGroupText} from "reactstrap";

const ConfirmEmail = props => {

    const {id} = useParams();
    const location = useLocation();
    const [code, setCode] = useState("");
    const [message, setMessage] = useState("Enter the confirmation code sent to your email.");
    const [status, setStatus] = useState("idle");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [redirectTimeout, setRedirectTimeout] = useState(null);

    const resetRedirectTimeout = useCallback(() => {
        if (redirectTimeout) {
            window.clearTimeout(redirectTimeout);
        }
    }, [redirectTimeout]);

    useEffect(() => {
        if (!id) {
            setStatus("error");
            setMessage("Invalid confirmation link.");
        }
    }, [id]);

    const submitCode = useCallback(async (value, isAutoSubmit = false) => {
        if (!id) {
            setStatus("error");
            setMessage("Invalid confirmation link.");
            return;
        }

        const trimmedValue = (value || "").trim();
        if (!trimmedValue) {
            if (!isAutoSubmit) {
                setStatus("idle");
                setMessage("Please enter the confirmation code sent to your email.");
            }
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await confirmRegister(id, trimmedValue);
            const {data} = response;
            if (data.success) {
                setStatus("success");
                setMessage("Email confirmed! You will be redirected to login...");
                resetRedirectTimeout();
                const timeout = window.setTimeout(() => {
                    props.history.push('/auth/login');
                }, 5000);
                setRedirectTimeout(timeout);
            } else {
                setStatus("error");
                setMessage(data.msg || "Something went wrong!");
            }
        } catch (err) {
            setStatus("error");
            setMessage("Something went wrong! Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }, [id, props.history, resetRedirectTimeout]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const codeFromQuery = params.get('code');
        if (codeFromQuery) {
            setCode(codeFromQuery);
            submitCode(codeFromQuery, true);
        }
    }, [location.search, submitCode]);

    useEffect(() => () => {
        resetRedirectTimeout();
    }, [resetRedirectTimeout]);

    const messageClassName = useMemo(() => {
        if (status === "success") {
            return "text-success";
        }
        if (status === "error") {
            return "text-danger";
        }
        return "text-muted";
    }, [status]);

    const onSubmit = useCallback((event) => {
        event.preventDefault();
        submitCode(code, false);
    }, [code, submitCode]);

    return (
        <>
            <Col lg="6" md="8">
                <Card className="bg-secondary shadow border-0">
                    <CardBody className="px-lg-5 py-lg-5">
                        <Form role="form" onSubmit={onSubmit}>
                            <FormGroup>
                                <InputGroup className="input-group-alternative mb-3">
                                    <InputGroupText>
                                        <i className="ni ni-email-83"/>
                                    </InputGroupText>
                                    <Input
                                        placeholder="Confirmation code"
                                        type="text"
                                        value={code}
                                        onChange={e => setCode(e.target.value)}
                                        disabled={status === "success"}
                                    />
                                </InputGroup>
                            </FormGroup>
                            <div className={`text-center mb-4 ${messageClassName}`}>
                                <h5 className="mb-0">{message}</h5>
                            </div>
                            {status !== "success" ? (
                                <div className="text-center">
                                    <Button color="primary" type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Confirming...' : 'Confirm email'}
                                    </Button>
                                </div>
                            ) : null}
                        </Form>
                    </CardBody>
                </Card>
            </Col>
        </>
    );
};

export default ConfirmEmail;
