import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import AddStartingPaperForm from '@/components/starting-papers/AddStartingPaperForm';

const AddStartingPapers = () => {
    return (
        <>
            <PageHeader >
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <AddStartingPaperForm title={"Add Starting Papers"} />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default AddStartingPapers;