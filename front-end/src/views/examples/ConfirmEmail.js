import React, {useEffect, useState} from 'react';
import { useParams } from 'react-router-dom';
import {confirmRegister} from "../../network/ApiAxios";
import {Card, CardBody, Col} from "reactstrap";

const ConfirmEmail = props => {

    const {id} = useParams();
    const [valid, setValid] = useState(true);

    useEffect(() => {
        if (!id) {
            setValid(false);
            return;
        }

        let isMounted = true;
        let redirectTimeout = null;

        const runAsync = async () => {
            const response = await confirmRegister(id);
            const {data} = response;

            if (!isMounted) {
                return;
            }

            if (!data.success) {
                setValid(false);
            } else {
                redirectTimeout = window.setTimeout(() => {
                    props.history.push('/auth/login');
                }, 5000);
            }
        };

        runAsync();

        return () => {
            isMounted = false;
            if (redirectTimeout) {
                clearTimeout(redirectTimeout);
            }
        };
    }, [id, props.history]);

    return (
        <>
            <Col lg="6" md="8">
                <Card className="bg-secondary shadow border-0">
                    <CardBody className="px-lg-5 py-lg-5">
                        <div className="text-center mb-4">
                            <h1>{valid ? "Email confirmed! You will be redirected to login..." : "Something went wrong!"}</h1>
                        </div>
                    </CardBody>
                </Card>
            </Col>
        </>
    )
};

export default ConfirmEmail;
