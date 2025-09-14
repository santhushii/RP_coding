import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import ViewPythonPaperForm from '@/components/python-papers/ViewPythonPaperForm';

const ViewPythonPapers = () => {
    return (
        <>
            <PageHeader >
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <ViewPythonPaperForm title={"Python Paper"} />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default ViewPythonPapers;