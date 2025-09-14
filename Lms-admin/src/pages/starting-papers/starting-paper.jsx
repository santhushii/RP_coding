import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import PageHeaderWidgets from '@/components/shared/pageHeader/PageHeaderWidgets';
import Footer from '@/components/shared/Footer';
import StartingPaperTable from '@/components/starting-papers/StartingPaperTable';

const StartingPapers = () => {
    return (
        <>
            <PageHeader>
                <PageHeaderWidgets addNewLink="/admin/starting-papers/create" name="Add New Paper" />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <StartingPaperTable title="Starting Paper List" />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default StartingPapers;
