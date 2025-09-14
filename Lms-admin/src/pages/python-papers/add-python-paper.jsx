import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import AddPythonPaperForm from '@/components/python-papers/AddPythonPaperForm';

const AddPythonPapers = () => {
    return (
        <>
            <PageHeader >
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <AddPythonPaperForm title={"Add Python Papers"} />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default AddPythonPapers;